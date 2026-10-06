use aes::Aes128;
use cbc::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};

use crate::models::error::PlayerError;

pub fn decrypt_aes128_cbc(data: &[u8], key: &[u8; 16], iv: &[u8; 16]) -> Result<Vec<u8>, PlayerError> {
    let decryptor = cbc::Decryptor::<Aes128>::new_from_slices(key, iv).map_err(|e| {
        log::error!("[player::crypto] AES-128 init failed: {e}");
        PlayerError::InvalidStream(format!("AES-128 init failed: {e}"))
    })?;
    decryptor.decrypt_padded_vec_mut::<Pkcs7>(data).map_err(|e| {
        log::error!("[player::crypto] AES-128 decrypt failed ({} bytes): {e}", data.len());
        PlayerError::InvalidStream(format!("AES-128 decrypt failed ({} bytes): {e}", data.len()))
    })
}

pub fn iv_for_sequence(sequence: u64) -> [u8; 16] {
    let mut iv = [0u8; 16];
    iv[8..].copy_from_slice(&sequence.to_be_bytes());
    iv
}

pub fn parse_hex_iv(raw: &str) -> Option<[u8; 16]> {
    let hex = raw.trim().trim_start_matches("0x").trim_start_matches("0X");
    if hex.len() != 32 {
        log::warn!("[player::crypto] IV has unexpected hex length {} (expected 32)", hex.len());
        return None;
    }
    let mut iv = [0u8; 16];
    for (index, byte) in iv.iter_mut().enumerate() {
        *byte = u8::from_str_radix(hex.get(index * 2..index * 2 + 2)?, 16).ok()?;
    }
    Some(iv)
}

pub fn key_from_bytes(bytes: &[u8]) -> Result<[u8; 16], PlayerError> {
    bytes.try_into().map_err(|_| {
        log::error!("[player::crypto] AES key has {} bytes, expected 16", bytes.len());
        PlayerError::InvalidStream(format!("AES key must be 16 bytes, got {}", bytes.len()))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cbc::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};

    fn hex(s: &str) -> Vec<u8> {
        (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap()).collect()
    }

    const KEY: &str = "2b7e151628aed2a6abf7158809cf4f3c";
    const IV: &str = "000102030405060708090a0b0c0d0e0f";
    const PLAINTEXT: &str = "6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710";
    const NIST_CIPHERTEXT: &str =
        "7649abac8119b246cee98e9b12e9197d5086cb9b507219ee95db113a917678b273bed6b8e3c1743b7116e69e222295163ff1caa1681fac09120eca307586e1a7";

    fn encrypt(pt: &[u8], key: &[u8], iv: &[u8]) -> Vec<u8> {
        cbc::Encryptor::<aes::Aes128>::new_from_slices(key, iv).unwrap().encrypt_padded_vec_mut::<Pkcs7>(pt)
    }

    #[test]
    fn cipher_matches_nist_sp800_38a_vector_and_round_trips() {
        let (key, iv, pt) = (hex(KEY), hex(IV), hex(PLAINTEXT));
        let ciphertext = encrypt(&pt, &key, &iv);
        assert_eq!(&ciphertext[..64], hex(NIST_CIPHERTEXT).as_slice());
        let key: [u8; 16] = key.try_into().unwrap();
        let iv: [u8; 16] = iv.try_into().unwrap();
        assert_eq!(decrypt_aes128_cbc(&ciphertext, &key, &iv).unwrap(), pt);
    }

    #[test]
    fn decrypt_rejects_bad_padding() {
        assert!(decrypt_aes128_cbc(&[0u8; 16], &[1u8; 16], &[0u8; 16]).is_err());
    }

    #[test]
    fn iv_from_sequence_is_big_endian() {
        let iv = iv_for_sequence(5);
        assert_eq!(&iv[..15], &[0u8; 15]);
        assert_eq!(iv[15], 5);
        assert_eq!(iv_for_sequence(0x0102)[14..], [1, 2]);
    }

    #[test]
    fn parses_hex_iv() {
        assert_eq!(parse_hex_iv("0x000102030405060708090A0B0C0D0E0F").unwrap()[15], 15);
        assert!(parse_hex_iv("0x1234").is_none());
        assert!(parse_hex_iv("0xZZ0102030405060708090a0b0c0d0e0f").is_none());
    }

    #[test]
    fn key_must_be_16_bytes() {
        assert!(key_from_bytes(&[0u8; 16]).is_ok());
        assert!(key_from_bytes(&[0u8; 15]).is_err());
    }
}
