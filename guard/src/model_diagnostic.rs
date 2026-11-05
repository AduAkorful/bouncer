//! Fixed model failure stages. Never include inputs, credentials or response contents.

#[derive(Debug, PartialEq, Eq)]
pub enum ModelFailure {
    Unknown, Key, Encode, SensitivePayload, Transport, DnsTimeout, ConnectTimeout, ReadTimeout, WriteTimeout, ResponseTimeout, TransportDns, TransportTls, Http, Body, Json, MissingContent, EmptyContent, CredentialEcho,
}

impl ModelFailure {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Unknown => "model:unknown",
            Self::Key => "model:key",
            Self::Encode => "model:encode",
            Self::SensitivePayload => "model:sensitive_payload",
            Self::Transport => "model:transport",
            Self::DnsTimeout => "model:dns_timeout",
            Self::ConnectTimeout => "model:connect_timeout",
            Self::ReadTimeout => "model:read_timeout",
            Self::WriteTimeout => "model:write_timeout",
            Self::ResponseTimeout => "model:response_timeout",
            Self::TransportDns => "model:transport_dns",
            Self::TransportTls => "model:transport_tls",
            Self::Http => "model:http",
            Self::Body => "model:body",
            Self::Json => "model:json",
            Self::MissingContent => "model:missing_content",
            Self::EmptyContent => "model:empty_content",
            Self::CredentialEcho => "model:credential_echo",
        }
    }
}

#[cfg(any(test, all(target_arch = "wasm32", target_os = "wasi")))]
pub fn transport_category(error: Option<&wasi::http::types::ErrorCode>) -> ModelFailure {
    use wasi::http::types::ErrorCode;
    match error {
        Some(ErrorCode::DnsTimeout) => ModelFailure::DnsTimeout,
        Some(ErrorCode::ConnectionTimeout) => ModelFailure::ConnectTimeout,
        Some(ErrorCode::ConnectionReadTimeout) => ModelFailure::ReadTimeout,
        Some(ErrorCode::ConnectionWriteTimeout) => ModelFailure::WriteTimeout,
        Some(ErrorCode::HttpResponseTimeout) => ModelFailure::ResponseTimeout,
        Some(ErrorCode::DnsError(_) | ErrorCode::DestinationNotFound) => ModelFailure::TransportDns,
        Some(ErrorCode::TlsProtocolError | ErrorCode::TlsCertificateError | ErrorCode::TlsAlertReceived(_)) => ModelFailure::TransportTls,
        _ => ModelFailure::Transport,
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
    fn classifies_transport_without_exposing_payloads() {
        use wasi::http::types::ErrorCode;
        for (error, expected) in [
            (ErrorCode::DnsTimeout, ModelFailure::DnsTimeout),
            (ErrorCode::ConnectionTimeout, ModelFailure::ConnectTimeout),
            (ErrorCode::ConnectionReadTimeout, ModelFailure::ReadTimeout),
            (ErrorCode::ConnectionWriteTimeout, ModelFailure::WriteTimeout),
            (ErrorCode::HttpResponseTimeout, ModelFailure::ResponseTimeout),
        ] {
            assert_eq!(transport_category(Some(&error)), expected);
        }
        assert_eq!(transport_category(Some(&ErrorCode::DestinationNotFound)), ModelFailure::TransportDns);
        assert_eq!(transport_category(Some(&ErrorCode::TlsCertificateError)), ModelFailure::TransportTls);
        assert_eq!(transport_category(Some(&ErrorCode::InternalError(Some("sensitive".into())))), ModelFailure::Transport);
        assert_eq!(transport_category(None), ModelFailure::Transport);
    }
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
