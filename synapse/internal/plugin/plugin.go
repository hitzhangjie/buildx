// Package plugin defines the extension point system for executors, authenticators, and importers.
//
// Maps to OneDev: io.onedev.commons.loader.*, server-plugin/*
package plugin

// Descriptor describes a loaded plugin and its capabilities.
type Descriptor struct {
	ID          string
	Name        string
	Version     string
	Description string
}

// Manager loads, wires, and unloads plugins at runtime.
type Manager interface {
	LoadAll() error
	List() []Descriptor
}
