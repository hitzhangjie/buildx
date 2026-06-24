package model_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

func TestUserConstants(t *testing.T) {
	if model.UserUnknownID >= 0 {
		t.Error("UserUnknownID should be negative")
	}
	if model.UserSystemID >= 0 {
		t.Error("UserSystemID should be negative")
	}
	if model.UserRootID != 1 {
		t.Error("UserRootID should be 1")
	}
}

func TestUserJSONTags(t *testing.T) {
	u := model.User{
		ID:       1,
		Name:     "alice",
		FullName: "Alice",
		Type:     model.UserTypeOrdinary,
		Disabled: false,
		Password: "secret",
	}
	b, err := json.Marshal(u)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	json.Unmarshal(b, &m)
	if m["id"] != float64(1) {
		t.Error("id field missing/invalid")
	}
	if m["name"] != "alice" {
		t.Error("name field missing/invalid")
	}
	// Password should not be serialized.
	if _, ok := m["password"]; ok {
		t.Error("password should not be serialized (json:\"-\")")
	}
}

func TestProjectJSONTags(t *testing.T) {
	parentID := int64(5)
	p := model.Project{
		ID:          1,
		Name:        "demo",
		Path:        "demo",
		PathLen:     4,
		Key:         "DEMO",
		Description: "a demo project",
		ParentID:    &parentID,
		CreateDate:  time.Now(),
	}
	b, err := json.Marshal(p)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	json.Unmarshal(b, &m)
	if m["id"] != float64(1) {
		t.Error("id field invalid")
	}
	if m["parentId"] != float64(5) {
		t.Error("parentId field invalid")
	}
}

func TestAccessTokenJSONTags(t *testing.T) {
	at := model.AccessToken{
		ID:                  1,
		Name:                "my-token",
		OwnerID:             42,
		Value:               "secret-value",
		HasOwnerPermissions: true,
	}
	b, _ := json.Marshal(at)
	var m map[string]any
	json.Unmarshal(b, &m)
	if m["id"] != float64(1) {
		t.Error("id field invalid")
	}
	if m["name"] != "my-token" {
		t.Error("name field invalid")
	}
	// Value should be omitted when empty.
	if _, ok := m["value"]; !ok {
		t.Error("value should be present when non-empty")
	}
}

func TestRoleConstants(t *testing.T) {
	if model.RoleOwnerID != 1 {
		t.Error("RoleOwnerID should be 1")
	}
}

func TestUserTypes(t *testing.T) {
	if model.UserTypeOrdinary != "ORDINARY" {
		t.Error("UserTypeOrdinary mismatch")
	}
	if model.UserTypeService != "SERVICE" {
		t.Error("UserTypeService mismatch")
	}
	if model.UserTypeAI != "AI" {
		t.Error("UserTypeAI mismatch")
	}
}
