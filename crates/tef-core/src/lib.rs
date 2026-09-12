//! A coordinate-free, single-source reference model.
//!
//! The source persists; each port holds one conserved diagnostic weight.
//! A local event moves that weight to the next state on its channel while
//! retaining the structural history. Weight is not assigned energy units.

use std::f64::consts::TAU;
use std::io::{self, Write};

pub const RULE: &str = "source-channels-v0.1";
pub const MAX_EVENTS: usize = 200_000;
pub const MAX_CHANNELS: usize = 2_048;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Scheduler {
    Balanced,
    Seeded,
}

impl Scheduler {
    pub fn name(self) -> &'static str {
        match self {
            Self::Balanced => "balanced",
            Self::Seeded => "seeded",
        }
    }
}

#[derive(Clone, Debug)]
pub struct Config {
    pub channels: usize,
    pub events: usize,
    pub phase_steps: u32,
    pub seed: u32,
    pub scheduler: Scheduler,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            channels: 256,
            events: 32_768,
            phase_steps: 32,
            seed: 42,
            scheduler: Scheduler::Balanced,
        }
    }
}

impl Config {
    pub fn validate(&self) -> Result<(), String> {
        if !(4..=MAX_CHANNELS).contains(&self.channels) {
            return Err(format!("channels must be between 4 and {MAX_CHANNELS}"));
        }
        if self.events > MAX_EVENTS {
            return Err(format!("events must not exceed {MAX_EVENTS}"));
        }
        if !(2..=4096).contains(&self.phase_steps) {
            return Err("phase_steps must be between 2 and 4096".into());
        }
        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Port {
    pub parent: usize,
    pub depth: u32,
}

/// Birth is event 0; every later event consumes one channel's frontier state.
/// Event ids are history labels, never physical timestamps.
#[derive(Clone, Debug, PartialEq)]
pub struct Event {
    pub id: usize,
    pub channel: usize,
    pub parent: usize,
    pub depth: u32,
    pub phase: f64,
    pub weight: f64,
}

#[derive(Clone, Debug)]
pub struct Engine {
    pub config: Config,
    pub ports: Vec<Port>,
    pub history: Vec<Event>,
}

impl Engine {
    pub fn new(config: Config) -> Result<Self, String> {
        config.validate()?;
        Ok(Self {
            ports: vec![
                Port {
                    parent: 0,
                    depth: 0
                };
                config.channels
            ],
            history: Vec::with_capacity(config.events),
            config,
        })
    }

    pub fn advance(&mut self, channel: usize) -> Result<Event, String> {
        if self.history.len() >= MAX_EVENTS {
            return Err("event limit reached".into());
        }
        let port = self.ports.get_mut(channel).ok_or("unknown channel")?;
        let depth = port.depth + 1;
        let event = Event {
            id: self.history.len() + 1,
            channel,
            parent: port.parent,
            depth,
            phase: f64::from(depth % self.config.phase_steps) * TAU
                / f64::from(self.config.phase_steps),
            weight: 1.0 / self.config.channels as f64,
        };
        port.depth = depth;
        port.parent = event.id;
        self.history.push(event.clone());
        Ok(event)
    }

    pub fn run(config: Config) -> Result<Self, String> {
        let mut engine = Self::new(config)?;
        let mut random = Random::new(engine.config.seed);
        for index in 0..engine.config.events {
            let channel = match engine.config.scheduler {
                Scheduler::Balanced => index % engine.config.channels,
                Scheduler::Seeded => random.below(engine.config.channels),
            };
            engine.advance(channel)?;
        }
        Ok(engine)
    }

    /// Check each transition, including state consumption, by replaying history.
    pub fn verify(&self) -> Result<(), String> {
        let mut replay = Self::new(self.config.clone())?;
        for event in &self.history {
            if &replay.advance(event.channel)? != event {
                return Err(format!("invalid transition at event {}", event.id));
            }
        }
        if replay.ports != self.ports {
            return Err("frontier does not match history".into());
        }
        Ok(())
    }

    pub fn frontier_weight(&self) -> f64 {
        self.ports
            .iter()
            .map(|_| 1.0 / self.config.channels as f64)
            .sum()
    }

    /// A small dependency-free export format. Strings are fixed enum values;
    /// no unescaped user text is interpolated into JSON.
    pub fn write_json(&self, mut out: impl Write) -> io::Result<()> {
        write!(
            out,
            "{{\"schema_version\":1,\"rule\":\"{RULE}\",\"engine_version\":\"{}\",",
            env!("CARGO_PKG_VERSION")
        )?;
        write!(out, "\"config\":{{\"channels\":{},\"events\":{},\"phase_steps\":{},\"seed\":{},\"scheduler\":\"{}\"}},",
            self.config.channels, self.config.events, self.config.phase_steps,
            self.config.seed, self.config.scheduler.name())?;
        write!(out, "\"conventions\":{{\"source\":\"hydrogen_proxy\",\"time\":\"causal_order_only\",\"weight\":\"dimensionless_frontier_transport\",\"space\":\"observer_mapping_only\"}},")?;
        write!(
            out,
            "\"birth\":{{\"id\":0,\"kind\":\"source_birth\",\"weight\":1.0}},\"events\":["
        )?;
        for (index, event) in self.history.iter().enumerate() {
            if index > 0 {
                write!(out, ",")?;
            }
            write!(out, "{{\"id\":{},\"channel\":{},\"parent\":{},\"depth\":{},\"phase\":{:.17},\"weight\":{:.17}}}",
                event.id, event.channel, event.parent, event.depth, event.phase, event.weight)?;
        }
        writeln!(out, "],\"summary\":{{\"source_count\":1,\"rollout_events\":{},\"frontier_states\":{},\"frontier_weight\":{:.17},\"max_depth\":{}}}}}",
            self.history.len(), self.ports.len(), self.frontier_weight(),
            self.ports.iter().map(|p| p.depth).max().unwrap_or(0))
    }
}

// Versioned deterministic scheduler RNG, with rejection sampling to avoid
// modulo bias. Scheduling randomness is not quantum amplitude evolution.
struct Random(u64);
impl Random {
    fn new(seed: u32) -> Self {
        Self(u64::from(seed).wrapping_add(0x9e3779b97f4a7c15))
    }
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9e3779b97f4a7c15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
        z ^ (z >> 31)
    }
    fn below(&mut self, count: usize) -> usize {
        let n = count as u64;
        let threshold = n.wrapping_neg() % n;
        loop {
            let value = self.next();
            if value >= threshold {
                return (value % n) as usize;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_event_consumes_its_own_frontier_and_preserves_weight() {
        let engine = Engine::run(Config {
            channels: 37,
            events: 1234,
            scheduler: Scheduler::Seeded,
            ..Config::default()
        })
        .unwrap();
        engine.verify().unwrap();
        assert!((engine.frontier_weight() - 1.0).abs() < 1e-12);
        assert!(engine.history.iter().all(|e| e.parent < e.id));
        assert_eq!(
            engine.ports.iter().map(|p| p.depth as usize).sum::<usize>(),
            1234
        );
    }

    #[test]
    fn independent_updates_commute_up_to_history_labels() {
        let config = Config {
            channels: 8,
            events: 0,
            ..Config::default()
        };
        let mut a = Engine::new(config.clone()).unwrap();
        let mut b = Engine::new(config).unwrap();
        for _ in 0..17 {
            for c in 0..8 {
                a.advance(c).unwrap();
            }
            for c in (0..8).rev() {
                b.advance(c).unwrap();
            }
        }
        for (x, y) in a.ports.iter().zip(&b.ports) {
            assert_eq!(x.depth, y.depth);
        }
        let signature = |e: &Engine| {
            let mut rows: Vec<_> = e
                .history
                .iter()
                .map(|x| (x.channel, x.depth, x.phase.to_bits(), x.weight.to_bits()))
                .collect();
            rows.sort();
            rows
        };
        assert_eq!(signature(&a), signature(&b));
        a.verify().unwrap();
        b.verify().unwrap();
    }

    #[test]
    fn seeded_history_is_reproducible() {
        let config = Config {
            scheduler: Scheduler::Seeded,
            ..Config::default()
        };
        assert_eq!(
            Engine::run(config.clone()).unwrap().history,
            Engine::run(config).unwrap().history
        );
    }

    #[test]
    fn replay_rejects_corrupted_causality() {
        let mut engine = Engine::run(Config {
            events: 10,
            ..Config::default()
        })
        .unwrap();
        engine.history[3].parent = 3;
        assert!(engine.verify().is_err());
    }

    #[test]
    fn full_local_cycle_restores_phase() {
        let mut engine = Engine::new(Config::default()).unwrap();
        for _ in 0..32 {
            engine.advance(0).unwrap();
        }
        assert_eq!(engine.history.last().unwrap().phase, 0.0);
        assert_eq!(engine.ports[1].depth, 0);
    }

    #[test]
    fn birth_only_and_invalid_configs() {
        let engine = Engine::run(Config {
            events: 0,
            ..Config::default()
        })
        .unwrap();
        engine.verify().unwrap();
        assert!(engine.history.is_empty());
        assert!(Engine::new(Config {
            channels: 0,
            ..Config::default()
        })
        .is_err());
        assert!(Engine::new(Config {
            events: MAX_EVENTS + 1,
            ..Config::default()
        })
        .is_err());
    }
}
