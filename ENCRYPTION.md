# End-to-End Encryption for Paid Minutes

## Overview

Catscribe implements lightweight end-to-end encryption (E2EE) for paid users to protect their audio files and transcription results during transmission. This document explains how the encryption works and how it's implemented.

## Security Model

### What is Protected

**For Paid Users Only** (users with minutes > 0):

1. **Audio Upload**: Audio files are encrypted client-side before upload
2. **Transcription Download**: Transcription files (.txt, .srt, .vtt) are encrypted server-side before download

### What is NOT Protected

1. **Free Tier Users**: No encryption is applied (backward compatible)
2. **Stored Data**: Files are stored unencrypted on server (deleted after 7 days)
3. **Processing**: Audio is decrypted server-side for transcription processing
4. **Metadata**: Job IDs, fingerprints, and other metadata are not encrypted

## Technical Implementation

### Encryption Algorithm

- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes) for GCM mode
- **Authentication**: GCM provides authenticated encryption (prevents tampering)

### Frontend (Client-Side)

**Technology**: Web Crypto API (browser native, no external dependencies)

**Upload Flow**:
1. User selects audio file
2. If user is paid (minutes > 0):
   - Generate random AES-256 key
   - Generate random 96-bit IV
   - Encrypt file using AES-GCM
   - Send encrypted file + key + IV to server
3. If user is free, send file as-is

**Download Flow**:
1. Request transcription file from server
2. If response is encrypted (JSON with encryption metadata):
   - Extract encrypted data, key, and IV
   - Decrypt using AES-GCM
   - Create download blob
3. If not encrypted, use file as-is

**Code Location**: `frontend/app/lib/crypto.ts`

### Backend (Server-Side)

**Technology**: Python `cryptography` library v42.0.4

**Upload Flow**:
1. Receive upload request
2. Check if user is paid (via Redis usage data)
3. If encrypted data detected (encryption_key + encryption_iv parameters):
   - Decrypt audio file using provided key/IV
   - Process transcription normally
4. If not encrypted, process as-is

**Download Flow**:
1. Receive download request
2. Check if user is paid (from job metadata)
3. If paid:
   - Generate new encryption key/IV for response
   - Encrypt transcription file
   - Return JSON with encrypted data + key + IV
4. If free, return file directly

**Code Location**: `backend/app/crypto.py`, `backend/app/main.py`

## Key Security Properties

### Strengths

1. **Client-Side Encryption**: Files are encrypted before leaving the user's device
2. **Strong Encryption**: AES-256-GCM is industry standard and NIST approved
3. **Authenticated Encryption**: GCM mode prevents tampering (AEAD)
4. **Fresh Keys**: New keys generated for each request (ephemeral)
5. **Secure Library**: Uses vetted cryptography library (no CVEs in v42.0.4)
6. **Browser Native**: Web Crypto API is built into browsers (no JS library vulnerabilities)

### Limitations

1. **Server Processes Plaintext**: Audio must be decrypted server-side for transcription
2. **Key Transmission**: Encryption keys are sent to server (over HTTPS)
3. **No Perfect Forward Secrecy**: If TLS is broken, past keys can be recovered
4. **Metadata Leakage**: File sizes, durations, languages are not hidden
5. **Trust in Server**: Server could log keys/plaintext (mitigated by code transparency)

## Threat Model

### Protected Against

- ✅ Passive network eavesdropping (over HTTP without TLS)
- ✅ Man-in-the-middle attacks (assuming TLS is secure)
- ✅ File tampering during transmission (GCM authentication)
- ✅ Data breach of encrypted data in transit

### NOT Protected Against

- ❌ Compromised server (server can access plaintext)
- ❌ Compromised TLS (keys transmitted over TLS)
- ❌ Browser/client malware (runs before encryption)
- ❌ Server-side logging (trust in server operator)

## Why This Approach?

This is "lightweight" E2EE suitable for a transcription service:

1. **Practical**: Server must access audio to transcribe it
2. **Defense in Depth**: Adds encryption layer even with HTTPS
3. **User Control**: Users can verify encryption in browser devtools
4. **Performance**: Minimal overhead (native crypto APIs)
5. **Backward Compatible**: Free users unaffected

## Future Improvements

Potential enhancements (not currently implemented):

1. **Client-Side Processing**: Run Whisper in browser (WASM) for true E2EE
2. **Key Derivation**: Use password-based key derivation (PBKDF2)
3. **Metadata Protection**: Encrypt file sizes, durations, etc.
4. **Audit Logging**: Cryptographically signed audit trail
5. **HSM Storage**: Store encryption keys in hardware security module

## Testing

**Backend Encryption Test**:
```bash
python3 /tmp/test_encryption.py
```

**Frontend Build Test**:
```bash
cd frontend && npm run build
```

**Manual E2E Test**:
1. Create paid account (add minutes via `/api/minutes/claim`)
2. Upload audio file (check Network tab for encrypted blob)
3. Download transcription (check for JSON response with encryption metadata)
4. Verify file content is correct after decryption

## Security Considerations for Developers

1. **Never Log Keys**: Do not log encryption keys or IVs in production
2. **Validate Input**: Always validate key/IV format before decryption
3. **Error Handling**: Do not leak information in error messages
4. **Secure Dependencies**: Keep cryptography library up to date
5. **Code Review**: Security-sensitive code should be reviewed

## Compliance

This implementation provides:

- **Data in Transit Protection**: Encryption during transmission
- **Separation of Concerns**: Different keys per request
- **Audit Trail**: Encryption can be verified by users

Note: This is NOT a substitute for proper data protection practices like:
- TLS/HTTPS (still required)
- Secure server configuration
- Access controls and authentication
- Data retention policies

## Contact

For security concerns or questions, please file an issue on GitHub or contact the maintainer.
