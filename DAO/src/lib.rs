// [no_std]
use soroban_sdk::{contract, contractimpl, contracterror, symbol_short, Address, Env, Symbol, token};

const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
const KEY_TREASURY_TOKEN: Symbol = symbol_short!("TTOK"); // token que guarda la tesorería

// #[contract]
pub struct DaoTreasury;

// #[contracterror]
// #[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error { NotInit=1, Unauthorized=2, Invalid=3 }

fn get<T: soroban_sdk::Val>(env: &Env, k: &Symbol) -> Result<T, Error> {
    env.storage().persistent().get::<_, T>(k).ok_or(Error::NotInit)
}

// #[contractimpl]
impl DaoTreasury {
    pub fn initialize(env: Env, admin: Address, treasury_token: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&KEY_ADMIN) { return Err(Error::Unauthorized); }
        admin.require_auth();
        env.storage().persistent().set(&KEY_ADMIN, &admin);
        env.storage().persistent().set(&KEY_TREASURY_TOKEN, &treasury_token);
        Ok(())
    }

    // Depósito: transfiere tokens hacia el contrato DAO
    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 { return Err(Error::Invalid); }
        from.require_auth();
        let token_addr: Address = get(&env, &KEY_TREASURY_TOKEN)?;
        let token = token::Client::new(&env, &token_addr);
        let to = env.current_contract_address();
        token.transfer(&from, &to, &amount);
        Ok(())
    }

    // Retiro controlado por admin (MVP)
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 { return Err(Error::Invalid); }
        let admin: Address = get(&env, &KEY_ADMIN)?;
        admin.require_auth();
        let token_addr: Address = get(&env, &KEY_TREASURY_TOKEN)?;
        let token = token::Client::new(&env, &token_addr);
        let from = env.current_contract_address();
        token.transfer(&from, &to, &amount);
        Ok(())
    }
}
