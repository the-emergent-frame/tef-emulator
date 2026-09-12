use std::io::{self, BufWriter, Write};
use tef_core::{Config, Engine, Scheduler};

fn main() {
    if let Err(error) = run() {
        eprintln!("tef-run: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let mut config = Config::default();
    let mut args = std::env::args().skip(1);
    while let Some(flag) = args.next() {
        if flag == "--help" || flag == "-h" {
            println!("tef-run [--channels 256] [--events 32768] [--phase-steps 32] [--seed 42] [--scheduler balanced|seeded]\nOutputs a JSON causal history. Events are updates, not time steps; weight has no energy units.");
            return Ok(());
        }
        let value = args
            .next()
            .ok_or_else(|| format!("missing value for {flag}"))?;
        match flag.as_str() {
            "--channels" => config.channels = value.parse().map_err(|_| "invalid channels")?,
            "--events" => config.events = value.parse().map_err(|_| "invalid events")?,
            "--phase-steps" => {
                config.phase_steps = value.parse().map_err(|_| "invalid phase steps")?
            }
            "--seed" => config.seed = value.parse().map_err(|_| "invalid seed")?,
            "--scheduler" => {
                config.scheduler = match value.as_str() {
                    "balanced" => Scheduler::Balanced,
                    "seeded" => Scheduler::Seeded,
                    _ => return Err("scheduler must be balanced or seeded".into()),
                }
            }
            _ => return Err(format!("unknown flag {flag}")),
        }
    }
    let engine = Engine::run(config)?;
    engine.verify()?;
    let mut out = BufWriter::new(io::stdout().lock());
    engine.write_json(&mut out).map_err(|e| e.to_string())?;
    out.flush().map_err(|e| e.to_string())
}
