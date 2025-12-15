# Helper script to run the backend
# This sets the PATH properly before running npm

$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" run dev
