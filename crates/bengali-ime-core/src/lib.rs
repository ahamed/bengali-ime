//! Phonetic roman-to-Bengali transliteration engine.
//!
//! A Rust port of the TypeScript `@ahamed/bengali-ime` engine (the reference
//! implementation). Behaviour is kept identical by replaying the fixtures in
//! `fixtures/engine/`, which are generated from the TypeScript engine.

pub mod data;
mod engine;
mod rules;
mod transpile;
mod vowel_attach;

pub use engine::{Action, Engine};
pub use transpile::transpile_roman_document;
pub use vowel_attach::{ends_with_consonant_and_chandrabindu, ends_with_kar_taking_consonant};
