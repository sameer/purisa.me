+++
title = "Testing HDL on GitHub with Github Actions"
date = 2021-02-06T22:58:20-05:00
description = "How I do continuous testing on all FPGA libraries in the hdl-util organization."
[taxonomies]
tags = ["fpga"]
+++

Many large open-source software projects use automated processes for examining code.
These serve to ensure:

* Consistent, reproducible test runs prior to release
* Publicly available test line/branch coverage reports
* Insight into dependency security advisories (i.e. [actions-rs/audit-check](https://github.com/actions-rs/audit-check))
* Baseline expectations for community contributions (if it doesn't pass, it doesn't get merged! :shrug:)
* ...and any other computable function!

For projects written in a hardware description language (HDL), it's quite a different story[^1].
These processes often run locally at the developer's discretion, are locked away in private continuous integration (CI) servers,
or just don't occur at all.

But not to worry, that doesn't mean there isn't a way to hold your projects to a higher standard! Below I describe the setup used by [hdl-util/hdmi](https://github.com/hdl-util/hdmi), where testbenches are run using [hdlmake](https://hdlmake.readthedocs.io/en/master/) + [ModelSim](https://en.wikipedia.org/wiki/ModelSim) in [Github Actions](https://docs.github.com/en/actions).

First, make sure you've set up hdlmake `Manifest.py`'s for your testbench and a `.do` file for ModelSim to run:

1. In `./test/top_tb/Manifest.py`
    ```python
    files = [
        # SystemVerilog testbench for the top module.
        "top_tb.sv"
    ]

    # Include the top module so the testbench's use of it is found in ModelSim
    modules = {
    "local" : [ "../../top/" ],
    }
    ```
1. In `./sim/top_tb/Manifest.py`
    ```python
    action = "simulation"
    sim_tool = "modelsim"
    sim_top = "top_tb"

    sim_post_cmd = "vsim -do ../vsim.do -c top_tb"

    modules = {
        "local" : [ "../../test/top_tb" ],
    }
    ```
    * The testbench module is named `top_tb`
1. In `./sim/vsim.do`
    ```do
    onfinish stop
    run -all
    if { [runStatus -full] == "break simulation_stop {\$finish}" } {
        echo Build succeeded
        quit -f -code 0
    } else {
        echo Build failed with status [runStatus -full]
        quit -f -code 1
    }
    ```
    * NOTE: the quit code here is important. A non-zero exit code is necessary to tell GH actions that the tests failed.
      For my purposes, the tests fail if the simulation ended early because a hard assertion failed. Make sure to set this up properly if you have a different use case or it might look like the tests are always passing.

Here's what the GitHub Actions workflow looks like:

```yaml
name: testbench run

# Runs when code is pushed to a branch or a pull request is created
on: [push, pull_request]

jobs:
  test:
    # At the time of writing, this is Ubuntu 18.04 Bionic Beaver but will be 20.04 Focal Fossa in the near future.
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      # Required for hdlmake
      - uses: actions/setup-python@v2
        with:
          python-version: '3.x'
      # Commonly used by Python projects to lock dependencies at specific versions.
      # In this case, it's just hdlmake==3.3
      - name: Install hdlmake
        run: pip install -r requirements.txt
        # ModelSim requires these 32-bit libraries to be installed: https://www.intel.com/content/www/us/en/programmable/support/support-resources/knowledge-base/solutions/rd05302012_638.html
        # Some of these are technically only required for the GUI, but it won't load on a headless server without them.
      - name: Install ModelSim dependencies
        run: |
          sudo dpkg --add-architecture i386
          sudo apt-get update
          sudo apt-get install lib32z1 lib32stdc++6 libexpat1:i386 libc6:i386 libsm6:i386 libncurses5:i386 libx11-6:i386 zlib1g:i386 libxext6:i386 libxft2:i386
        # Save time on subsequent runs by caching the install of ModelSim.
        # Download is ~1.5GB and combined with the installation process it takes over 3 minutes.
      - name: Cache ModelSim
        uses: actions/cache@v2
        with:
          path: $HOME/intelFPGA
          key: ${{ runner.os }}-modelsim
      - name: Install ModelSim if not cached
        run: stat $HOME/intelFPGA/20.1/modelsim_ase || (curl 'https://download.altera.com/akdlm/software/acdsinst/20.1std.1/720/ib_installers/ModelSimSetup-20.1.1.720-linux.run' -o ModelSimSetup.run && chmod +x ModelSimSetup.run && ./ModelSimSetup.run --mode unattended --accept_eula 1 && sed -i 's/linux_rh60/linux/g' $HOME/intelFPGA/20.1/modelsim_ase/vco )
      - name: Add ModelSim to PATH
        run: echo "$HOME/intelFPGA/20.1/modelsim_ase/bin" >> $GITHUB_PATH
        # hdlmake creates a Makefile which will run the ModelSim command for running the testbench
      - name: Top Testbench
        run: cd $GITHUB_WORKSPACE/sim/top_tb/ && hdlmake fetch && hdlmake && make
      - name: Audio Param Testbench
        run: cd $GITHUB_WORKSPACE/sim/audio_param_tb/ && hdlmake fetch && hdlmake && make
      - name: Audio Clock Testbench
        run: cd $GITHUB_WORKSPACE/sim/audio_param_tb/ && hdlmake fetch && hdlmake && make
```

Hopefully that comes in handy for you or another reader. Feel free to [reach out](/about) if you have any questions.

[^1]: as far as I've seen :slightly_smiling_face: