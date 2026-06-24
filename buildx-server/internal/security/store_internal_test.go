package security

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	tests := []string{"", "a", "short", "this is a longer password with spaces"}
	for _, pw := range tests {
		t.Run("len_"+string(rune(len(pw)+'0')), func(t *testing.T) {
			hash, err := HashPassword(pw)
			if err != nil {
				t.Fatalf("HashPassword(%q): %v", pw, err)
			}
			if hash == "" {
				t.Fatal("expected non-empty hash")
			}
			if hash == pw {
				t.Fatal("hash should not equal plaintext")
			}
		})
	}
}

func TestHashPasswordUnique(t *testing.T) {
	h1, _ := HashPassword("samepassword")
	h2, _ := HashPassword("samepassword")
	if h1 == h2 {
		t.Fatal("bcrypt hashes with same password should differ (different salt)")
	}
}

func TestCheckPassword(t *testing.T) {
	hash, _ := HashPassword("mypassword")

	if !CheckPassword(hash, "mypassword") {
		t.Fatal("CheckPassword should return true for correct password")
	}
	if CheckPassword(hash, "wrongpassword") {
		t.Fatal("CheckPassword should return false for incorrect password")
	}
	if CheckPassword(hash, "") {
		t.Fatal("CheckPassword should return false for empty password")
	}
}

func TestCheckPasswordMalformedHash(t *testing.T) {
	if CheckPassword("not-a-valid-bcrypt-hash", "anything") {
		t.Fatal("CheckPassword should return false for malformed hash")
	}
}

func TestGenerateSecret(t *testing.T) {
	s, err := GenerateSecret()
	if err != nil {
		t.Fatalf("GenerateSecret: %v", err)
	}
	if len(s) == 0 {
		t.Fatal("expected non-empty secret")
	}
	if len(s) != 43 {
		t.Fatalf("expected 32-byte base64url = 43 chars, got %d: %q", len(s), s)
	}
}

func TestGenerateSecretUnique(t *testing.T) {
	s1, _ := GenerateSecret()
	s2, _ := GenerateSecret()
	if s1 == s2 {
		t.Fatal("consecutive GenerateSecret calls should produce different values")
	}
}

func TestErrVariables(t *testing.T) {
	// Ensure sentinel errors are non-nil and distinct.
	if ErrInvalidCredentials == nil {
		t.Fatal("ErrInvalidCredentials is nil")
	}
	if ErrUserDisabled == nil {
		t.Fatal("ErrUserDisabled is nil")
	}
	if ErrUnauthorized == nil {
		t.Fatal("ErrUnauthorized is nil")
	}
	if ErrInvalidCredentials.Error() == ErrUnauthorized.Error() {
		t.Fatal("sentinel errors should have distinct messages")
	}
}
