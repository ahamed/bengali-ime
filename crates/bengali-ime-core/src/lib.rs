//! Phonetic roman-to-Bengali transliteration engine.
//!
//! A Rust port of the TypeScript `@ahamed/bengali-ime` engine (the reference
//! implementation). Behaviour is kept identical by replaying the fixtures in
//! `fixtures/engine/`, which are generated from the TypeScript engine.

pub mod data;
mod engine;
mod rules;
mod vowel_attach;

pub use engine::{Action, Engine};
pub use vowel_attach::should_attach_kar_when_buffer_empty;
