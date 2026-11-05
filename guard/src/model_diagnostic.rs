//! Fixed model failure stages. Never include inputs, credentials or response contents.

#[derive(Debug, PartialEq, Eq)]
pub enum ModelFailure {
    Key, Encode, SensitivePayload, Transport, Http, Body, Json, MissingContent, EmptyContent, CredentialEcho,
}

impl ModelFailure {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Key => "model:key",
            Self::Encode => "model:encode",
            Self::SensitivePayload => "model:sensitive_payload",
            Self::Transport => "model:transport",
            Self::Http => "model:http",
            Self::Body => "model:body",
            Self::Json => "model:json",
            Self::MissingContent => "model:missing_content",
            Self::EmptyContent => "model:empty_content",
            Self::CredentialEcho => "model:credential_echo",
        }
    }
}

pub fn completion_content<'a>(bytes: &'a [u8], key: &str) -> Result<String, ModelFailure> {
    let parsed: serde_json::Value = serde_json::from_slice(bytes).map_err(|_| ModelFailure::Json)?;
    let text = parsed.pointer("/choices/0/message/content").and_then(|v| v.as_str()).ok_or(ModelFailure::MissingContent)?;
    if text.is_empty() { return Err(ModelFailure::EmptyContent); }
    if text.contains(key) { return Err(ModelFailure::CredentialEcho); }
    Ok(text.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn classifies_responses_without_echoing_content() {
        assert_eq!(completion_content(b"bad", "secret"), Err(ModelFailure::Json));
        assert_eq!(completion_content(br#"{}"#, "secret"), Err(ModelFailure::MissingContent));
        assert_eq!(completion_content(br#"{"choices":[{"message":{"content":""}}]}"#, "secret"), Err(ModelFailure::EmptyContent));
        assert_eq!(completion_content(br#"{"choices":[{"message":{"content":"secret"}}]}"#, "secret"), Err(ModelFailure::CredentialEcho));
        assert_eq!(completion_content(br#"{"choices":[{"message":{"content":"hello"}}]}"#, "secret"), Ok("hello".to_string()));
        for failure in [ModelFailure::Key, ModelFailure::Encode, ModelFailure::SensitivePayload, ModelFailure::Transport, ModelFailure::Http, ModelFailure::Body, ModelFailure::Json, ModelFailure::MissingContent, ModelFailure::EmptyContent, ModelFailure::CredentialEcho] {
            assert!(failure.label().starts_with("model:"));
            assert!(!failure.label().contains("secret"));
        }
    }
}
