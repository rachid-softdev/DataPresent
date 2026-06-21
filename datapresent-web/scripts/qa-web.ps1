#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Convenience wrapper for qa-web.js — interactive QA session with Playwright.

.DESCRIPTION
  Launches or connects to a Next.js dev server, opens Playwright in headed mode
  (or headless with -Headless), and provides an interactive QA environment.

  Equivalent to: node scripts/qa-web.js [--url=...] [--headless]

.PARAMETER Url
  Target URL for the QA session (default: http://localhost:3000).

.PARAMETER Headless
  Run browser in headless mode (no visible window).

.EXAMPLE
  .\scripts\qa-web.ps1
  .\scripts\qa-web.ps1 -Url "http://localhost:3001"
  .\scripts\qa-web.ps1 -Headless
#>

param(
  [string]$Url,
  [switch]$Headless
)

$nodeArgs = @()

if ($Url) { $nodeArgs += "--url=$Url" }
if ($Headless) { $nodeArgs += "--headless" }

$scriptPath = Join-Path -Path $PSScriptRoot -ChildPath "qa-web.js"

node $scriptPath @nodeArgs
