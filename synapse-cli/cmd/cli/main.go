package main

import (
	"fmt"
	"os"

	cli "github.com/hitzhangjie/buildx/synapse-cli/cmds"
)

func main() {
	root := cli.NewRootCommand()
	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
