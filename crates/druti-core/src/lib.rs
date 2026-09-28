//! Phonetic roman-to-Bengali transliteration engine.
//!
//! See `README.md` for the API overview and the places where this crate
//! intentionally differs from the TypeScript engine.
//!
//! A Rust port of the TypeScript `@ahamed/bengali-ime` engine (the reference
//! implementation). Behaviour is kept identical by replaying the fixtures in
//! `fixtures/engine/`, which are generated from the TypeScript engine.

mod composer;
pub mod data;
mod engine;
mod rules;
mod transpile;
mod vowel_attach;

pub use composer::{Composer, Update};
pub use engine::{Action, Config, Engine};
pub use transpile::{transpile_roman_document, transpile_roman_document_with_config};
pub use vowel_attach::{ends_with_consonant_and_chandrabindu, ends_with_kar_taking_consonant};
