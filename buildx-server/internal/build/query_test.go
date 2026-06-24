package build_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

func TestParseQuery_jobAndStatus(t *testing.T) {
	filter := build.ParseQuery(`"Job" is "Release" and "Status" is successful`)
	if filter.JobName != "Release" {
		t.Fatalf("jobName = %q", filter.JobName)
	}
	if filter.Status != string(model.BuildStatusSuccessful) {
		t.Fatalf("status = %q", filter.Status)
	}
}

func TestParseQuery_numberAndProject(t *testing.T) {
	filter := build.ParseQuery(`"Number" is "demo#42"`)
	if filter.NumberProjectPath != "demo" || filter.Number != 42 {
		t.Fatalf("number filter = %+v", filter)
	}
}

func TestParseQuery_freeText(t *testing.T) {
	filter := build.ParseQuery("release")
	if filter.FreeText != "release" {
		t.Fatalf("freeText = %q", filter.FreeText)
	}
}

func TestParseQuery_orderByFinishDate(t *testing.T) {
	filter := build.ParseQuery(`order by "Finish Date" desc`)
	if !filter.OrderByFinishDate {
		t.Fatal("expected order by finish date")
	}
}
