# Observer

A dependency-free English JavaScript/Canvas viewer, served by `python3 python/serve.py`. Rust generates the history; the browser replays it.

- Generate a balanced or seeded run with adjustable channel count and phase period.
- Play, pause, step, or scrub back to before the supplied source birth.
- Orbit by dragging, zoom by scrolling, and click frontiers to inspect events.
- Switch to the causal view to inspect parent dependencies in selected channels.
- Export the complete JSON record with the current observer position and camera to the local project `runs/` directory; import it to resume an inspection after local transition verification.

Mapping version: `fibonacci-depth-v0.1`, specified in the [rule record](../rules/source-channels-v0.1/README.md). Display sampling never edits the history. Camera state and animation speed have no role in the engine.

The phase histogram scales its tallest bin to chart height and uses 16 bins over `[0, 2π)`. The phase statistic includes all available channel frontiers, even ports that have not advanced. The dispersion bar saturates at 1, while its numeric label retains the full value.

Rerun remains an optional future integration; the present viewer requires no frontend build process or remote resources.
