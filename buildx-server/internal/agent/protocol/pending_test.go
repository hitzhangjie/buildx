package protocol_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/jobdata"
	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/protocol"
)

func TestPendingJobComplete(t *testing.T) {
	ch := protocol.RegisterPending("tok-1")
	defer protocol.CancelPending("tok-1")

	go func() {
		protocol.CompletePending(jobdata.JobResult{JobToken: "tok-1", Success: true})
	}()

	result := <-ch
	if !result.Success || result.JobToken != "tok-1" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestCancelPending(t *testing.T) {
	ch := protocol.RegisterPending("tok-2")
	protocol.CancelPending("tok-2")
	select {
	case <-ch:
		t.Fatal("should not receive after cancel")
	default:
	}
}
