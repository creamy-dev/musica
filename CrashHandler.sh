#!/bin/bash

export isCtrlCAllowed=1

clear
echo "CrashHandler v0.1a Starting Up..."
echo "Made for Musica, written by Creamy."
echo "-------------------------------------"

trap exit INT

exit() {
  if [ "$isCtrlCAllowed" -eq "1" ]; then
    echo "INFO> It's a trap!"
    echo "INFO> Killing process..."
    kill -SIGHUP $$
  else
    echo "INFO> Control C is disabled!"
  fi
}

echo "INIT> Starting Musica..."
while :; do
  npm start
  echo "WARN> Crash detected!"
  echo "INFO> Restarting bot in 5 seconds..."
  sleep 5
  echo "INFO> Restarting now!"
done

