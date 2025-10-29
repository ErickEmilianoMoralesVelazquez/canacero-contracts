#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, token, Address, Env, Map, Symbol,
};

const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
const KEY_TOKEN: Symbol = symbol_short!("TOKEN");
const EV_PAYOUT: Symbol = symbol_short!("PAYOUT");
const EV_DISTR: Symbol = symbol_short!("DISTR");

#[contract]
pub struct CanaCeroContract;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidAmount = 3,
}

fn must_get_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .persistent()
        .get::<_, Address>(&KEY_ADMIN)
        .ok_or(Error::NotInitialized)
}
fn must_get_token(env: &Env) -> Result<Address, Error> {
    env.storage()
        .persistent()
        .get::<_, Address>(&KEY_TOKEN)
        .ok_or(Error::NotInitialized)
}

#[contractimpl]
impl CanaCeroContract {
    /// Debe llamarse una sola vez para fijar admin y dirección del token
    pub fn initialize(env: Env, admin: Address, token_address: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&KEY_ADMIN) {
            return Err(Error::Unauthorized); // ya inicializado
        }
        admin.require_auth(); // quien establece admin se autentica
        env.storage().persistent().set(&KEY_ADMIN, &admin);
        env.storage().persistent().set(&KEY_TOKEN, &token_address);
        Ok(())
    }

    /// Pago desde el saldo del contrato a `to` (NO es "mint", es transferencia).
    /// Útil cuando el contrato custodia fondos y los libera bajo reglas.
    pub fn payout_from_contract(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        let admin = must_get_admin(&env)?;
        admin.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_addr = must_get_token(&env)?;
        let token = token::Client::new(&env, &token_addr);
        let from = env.current_contract_address();
        token.transfer(&from, &to, &amount);

        env.events().publish((EV_PAYOUT, &to), amount);
        Ok(())
    }

    /// Reparte `total` 70/20/10 con residuo absorbido por la última parte (DAO)
    pub fn distribute_revenue(
        env: Env,
        producer: Address,
        verifier: Address,
        dao_fund: Address,
        total: i128,
    ) -> Result<(), Error> {
        let admin = must_get_admin(&env)?;
        admin.require_auth();
        if total <= 0 {
            return Err(Error::InvalidAmount);
        }

        let producer_share = total * 70 / 100;
        let verifier_share = total * 20 / 100;
        let dao_share = total - producer_share - verifier_share;

        let token_addr = must_get_token(&env)?;
        let token = token::Client::new(&env, &token_addr);
        let from = env.current_contract_address();

        token.transfer(&from, &producer, &producer_share);
        token.transfer(&from, &verifier, &verifier_share);
        token.transfer(&from, &dao_fund, &dao_share);

        let mut meta: Map<Symbol, i128> = Map::new(&env);
        meta.set(symbol_short!("total"), total);
        meta.set(symbol_short!("prod"), producer_share);
        meta.set(symbol_short!("veri"), verifier_share);
        meta.set(symbol_short!("dao"), dao_share);

        env.events()
            .publish((EV_DISTR, &producer, &verifier, &dao_fund), meta);
        Ok(())
    }

    /* --------- OPCIONAL: si tu token soporta "mint" y este contrato es minter ---------
    pub fn mint_token(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        let admin = must_get_admin(&env)?;
        admin.require_auth();
        if amount <= 0 { return Err(Error::InvalidAmount); }

        let token_addr = must_get_token(&env)?;
        let token = token::Client::new(&env, &token_addr);
        token.mint(&to, &amount); // requiere que este contrato sea minter del token

        env.events().publish((symbol_short!("MINT"), &to), amount);
        Ok(())
    }
    ------------------------------------------------------------------------------- */
}
