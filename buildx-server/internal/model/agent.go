package model

import "time"

// Agent is a build/workspace agent node.
// Maps to OneDev's io.onedev.server.model.Agent.
type Agent struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	Token   string `json:"token,omitempty"`
	OS      string `json:"os,omitempty"`      // osName
	Arch    string `json:"arch,omitempty"`    // osArch
	Version string `json:"version,omitempty"` // agentVersion

	// Status / resource fields
	OSVersion string `json:"osVersion,omitempty"`
	IPAddress string `json:"ipAddress,omitempty"`
	CPUCount  int    `json:"cpuCount"`
	Paused    bool   `json:"paused"`
	Online    bool   `json:"online"`

	CpuLoad   float64 `json:"cpuLoad,omitempty"`
	MemTotal  int64   `json:"memTotal,omitempty"`
	MemFree   int64   `json:"memFree,omitempty"`
	DiskTotal int64   `json:"diskTotal,omitempty"`
	DiskFree  int64   `json:"diskFree,omitempty"`

	LastActiveDate *time.Time         `json:"lastActiveDate,omitempty"`
	Attributes     map[string]string  `json:"attributes,omitempty"`
	AgentVersion   string             `json:"agentVersion,omitempty"`
}

// AgentAttribute is a key-value pair associated with an Agent.
// Maps to OneDev's io.onedev.server.model.AgentAttribute.
type AgentAttribute struct {
	ID      int64  `json:"id"`
	AgentID int64  `json:"agentId"`
	Name    string `json:"name"`
	Value   string `json:"value"`
}

// AgentToken is an authentication token for an Agent.
// Maps to OneDev's io.onedev.server.model.AgentToken.
type AgentToken struct {
	ID         int64     `json:"id"`
	AgentID    int64     `json:"agentId"`
	Token      string    `json:"token"`
	CreateDate time.Time `json:"createDate"`
}

// AgentData represents registration/status data sent by an agent.
type AgentData struct {
	OSName     string            `json:"osName"`
	OSVersion  string            `json:"osVersion"`
	OSArch     string            `json:"osArch"`
	CPUCount   int               `json:"cpuCount"`
	CpuLoad    float64           `json:"cpuLoad,omitempty"`
	MemTotal   int64             `json:"memTotal"`
	MemFree    int64             `json:"memFree,omitempty"`
	DiskTotal  int64             `json:"diskTotal"`
	DiskFree   int64             `json:"diskFree,omitempty"`
	Name       string            `json:"name"`
	Version    string            `json:"version,omitempty"`
	Attributes map[string]string `json:"attributes,omitempty"`
}
