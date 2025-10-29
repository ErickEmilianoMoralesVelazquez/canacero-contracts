#!/bin/bash
set -e
cargo build --target wasm32-unknown-unknown --release
echo "✅ Contrato CañaCero compilado en ./target/wasm32-unknown-unknown/release/"
