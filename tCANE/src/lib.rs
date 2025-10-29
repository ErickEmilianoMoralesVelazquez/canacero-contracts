// #![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, symbol_short, Address, Env, Symbol, token};

const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
const KEY_MINTER: Symbol = symbol_short!("MINTER");
const KEY_TOKEN: Symbol = symbol_short!("TOKEN"); // si apuntas a token estándar externo

// #[contract]
pub struct TCane;

// #[contracterror]
// #[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error { NotInit=1, Unauthorized=2, Invalid=3 }

fn get<T: soroban_sdk::Val>(env: &Env, k: &Symbol) -> Result<T, Error> {
    env.storage().persistent().get::<_, T>(k).ok_or(Error::NotInit)
}

// #[contractimpl]
impl TCane {
    // Si usas el token estándar externo, guarda su address como TOKEN y usa mint/burn del token estándar
    pub fn initialize(env: Env, admin: Address, token_address: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&KEY_ADMIN) { return Err(Error::Unauthorized); }
        admin.require_auth();
        env.storage().persistent().set(&KEY_ADMIN, &admin);
        env.storage().persistent().set(&KEY_TOKEN, &token_address);
        // Por defecto solo este contrato es minter; puedes cambiar con set_minter
        env.storage().persistent().set(&KEY_MINTER, &env.current_contract_address());
        Ok(())
    }

    pub fn set_minter(env: Env, minter: Address) -> Result<(), Error> {
        let admin: Address = get(&env, &KEY_ADMIN)?;
        admin.require_auth();
        env.storage().persistent().set(&KEY_MINTER, &minter);
        Ok(())
    }

    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 { return Err(Error::Invalid); }
        let minter: Address = get(&env, &KEY_MINTER)?;
        minter.require_auth();
        let token_addr = get::<Address>(&env, &KEY_TOKEN)?;
        let token = token::Client::new(&env, &token_addr);
        token.mint(&to, &amount);
        Ok(())
    }

    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 { return Err(Error::Invalid); }
        let minter: Address = get(&env, &KEY_MINTER)?;
        minter.require_auth();
        let token_addr = get::<Address>(&env, &KEY_TOKEN)?;
        let token = token::Client::new(&env, &token_addr);
        token.burn(&from, &amount);
        Ok(())
    }
}
