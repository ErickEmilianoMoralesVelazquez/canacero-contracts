// #![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, symbol_short, Address, Env, Symbol, token};

const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
const KEY_TOKEN: Symbol = symbol_short!("TOKEN");
// #[contract]
pub struct RevenueSplit;

// #[contracterror]
// #[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error { NotInit=1, Unauthorized=2, Invalid=3 }

fn get<T: soroban_sdk::Val>(env: &Env, k: &Symbol) -> Result<T, Error> {
    env.storage().persistent().get::<_, T>(k).ok_or(Error::NotInit)
}

// #[contractimpl]
impl RevenueSplit {
    pub fn initialize(env: Env, admin: Address, token_address: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&KEY_ADMIN) { return Err(Error::Unauthorized); }
        admin.require_auth();
        env.storage().persistent().set(&KEY_ADMIN, &admin);
        env.storage().persistent().set(&KEY_TOKEN, &token_address);
        Ok(())
    }

    pub fn distribute(env: Env, producer: Address, verifier: Address, dao: Address, total: i128) -> Result<(), Error> {
        let admin: Address = get(&env, &KEY_ADMIN)?;
        admin.require_auth();
        if total <= 0 { return Err(Error::Invalid); }

        let p = total * 70 / 100;
        let v = total * 20 / 100;
        let d = total - p - v; // absorbe residuo

        let token_addr: Address = get(&env, &KEY_TOKEN)?;
        let token = token::Client::new(&env, &token_addr);
        let from = env.current_contract_address();

        token.transfer(&from, &producer, &p);
        token.transfer(&from, &verifier, &v);
        token.transfer(&from, &dao, &d);
        Ok(())
    }
}
