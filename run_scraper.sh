#!/bin/bash

# Define the current directory instead of using /app
SCRIPT_DIR="$(pwd)"
STATUS_FILE="${SCRIPT_DIR}/scraper_status.txt"
LOG_FILE="${SCRIPT_DIR}/scraper.log"
LAST_RUN_FILE="${SCRIPT_DIR}/last_run.txt"
PROGRESS_FILE="${SCRIPT_DIR}/scraper_progress.txt"
SCRAPER_STATS_FILE="${SCRIPT_DIR}/scraper_stats.json"

start_scraping() {
  # Set status to running
  echo "running" > "${STATUS_FILE}"
  
  # Record the start time in ISO format for better parsing
  START_TIME=$(date -Iseconds)
  START_TIME_READABLE=$(date)
  echo "Starting scrape process at ${START_TIME_READABLE}" > "${LOG_FILE}"
  
  # Record the last run time in ISO format
  echo "${START_TIME}" > "${LAST_RUN_FILE}"
  
  # Initialize progress file with start time
  echo "Initializing scraper at ${START_TIME_READABLE}" > "${PROGRESS_FILE}"
  echo "Start time: ${START_TIME}" >> "${PROGRESS_FILE}"
  
  # Create initial stats file to track running state
  echo "{
    \"last_run\": \"${START_TIME}\",
    \"last_run_readable\": \"${START_TIME_READABLE}\",
    \"status\": \"running\",
    \"duration_seconds\": 0,
    \"current_duration_seconds\": 0,
    \"duration_formatted\": \"00:00:00\",
    \"current_duration_formatted\": \"00:00:00\",
    \"progress_percent\": 0,
    \"current_account\": \"initializing...\",
    \"exit_code\": null
  }" > "${SCRAPER_STATS_FILE}"
  
  # Add a delay to ensure the frontend can detect that we're in running state
  sleep 2
  
  # Verify status is still set to running (defensive programming)
  echo "running" > "${STATUS_FILE}"
  
  # Run the scraper
  python "${SCRIPT_DIR}/scrape_new.py" --all >> "${LOG_FILE}" 2>&1
  
  # Get the result
  RESULT=$?
  
  # Calculate the duration
  END_TIME=$(date -Iseconds)
  END_TIME_READABLE=$(date)
  
  # Calculate duration in seconds
  START_SECONDS=$(date -d "${START_TIME}" +%s)
  END_SECONDS=$(date -d "${END_TIME}" +%s)
  DURATION=$((END_SECONDS - START_SECONDS))
  
  # Format duration as HH:MM:SS
  DURATION_FORMATTED=$(printf "%02d:%02d:%02d" $((DURATION/3600)) $((DURATION%3600/60)) $((DURATION%60)))
  
  # Log completion
  echo "Scraping completed at ${END_TIME_READABLE} (duration: ${DURATION_FORMATTED})" >> "${LOG_FILE}"
  
  # Update stats file with structured data
  echo "{
    \"last_run\": \"${END_TIME}\",
    \"last_run_readable\": \"${END_TIME_READABLE}\",
    \"status\": \"idle\",
    \"duration_seconds\": ${DURATION},
    \"duration_formatted\": \"${DURATION_FORMATTED}\",
    \"exit_code\": ${RESULT}
  }" > "${SCRAPER_STATS_FILE}"
  
  # Also update the historical stats file
  STATS_DIR="${SCRIPT_DIR}/stats"
  STATS_FILE="${STATS_DIR}/scrape_stats.json"
  
  # Make sure stats directory exists
  mkdir -p "${STATS_DIR}"
  
  # Get follower count and other data from the scrape_new.py output
  ACCOUNTS_TOTAL=0
  ACCOUNTS_SUCCESSFUL=0
  TOTAL_FOLLOWERS=0
  
  # Extract counts from log file (looking for "Scraping complete: X successful, Y failed" line)
  if grep -q "Scraping complete:" "${LOG_FILE}"; then
    SCRAPE_LINE=$(grep "Scraping complete:" "${LOG_FILE}" | tail -1)
    # Extract successful count (X from "X successful")
    if [[ $SCRAPE_LINE =~ ([0-9]+)[[:space:]]*successful ]]; then
      ACCOUNTS_SUCCESSFUL=${BASH_REMATCH[1]}
    fi
    # Extract total by adding successful and failed (Y from "Y failed")
    if [[ $SCRAPE_LINE =~ ([0-9]+)[[:space:]]*failed ]]; then
      FAILED_COUNT=${BASH_REMATCH[1]}
      ACCOUNTS_TOTAL=$((ACCOUNTS_SUCCESSFUL + FAILED_COUNT))
    fi
  fi
  
  # Try to read the follower count from the data file (simple approximation)
  DATA_FILE="${SCRIPT_DIR}/data/latest_data.json"
  if [ -f "${DATA_FILE}" ]; then
    # Use grep to find all follower_count lines and sum them up (rough estimate)
    # This is a simplified approach; a proper parser would be better
    FOLLOWER_SUM=$(grep -o '"follower_count":[0-9]*' "${DATA_FILE}" | 
                   grep -o '[0-9]*' | 
                   awk '{s+=$1} END {print s}')
    if [ -n "${FOLLOWER_SUM}" ]; then
      TOTAL_FOLLOWERS=${FOLLOWER_SUM}
    fi
  fi
  
  # Create new stats entry
  NEW_ENTRY="{
    \"timestamp\": \"${END_TIME}\",
    \"duration_seconds\": ${DURATION},
    \"accounts_total\": ${ACCOUNTS_TOTAL},
    \"accounts_successful\": ${ACCOUNTS_SUCCESSFUL},
    \"total_followers\": ${TOTAL_FOLLOWERS},
    \"method\": \"SmartProxy API\"
  }"
  
  # If the stats file exists, append to it; otherwise create it
  if [ -f "${STATS_FILE}" ]; then
    # Read existing content - use a temporary file to avoid issues with shell string manipulation
    TMP_FILE="${STATS_DIR}/tmp_stats.json"
    
    # Create a valid JSON array
    echo "[" > "${TMP_FILE}"
    
    # Extract the content (excluding opening and closing brackets) from the existing file
    grep -v "^\[" "${STATS_FILE}" | grep -v "^\]" >> "${TMP_FILE}"
    
    # Add a comma if there's content
    if [ "$(stat -c %s ${TMP_FILE})" -gt 2 ]; then
      # If the file ends with a closing brace, add a comma
      if grep -q "}$" "${TMP_FILE}"; then
        sed -i 's/}$/},/' "${TMP_FILE}"
      fi
    fi
    
    # Add the new entry and close the array
    echo "  ${NEW_ENTRY}" >> "${TMP_FILE}"
    echo "]" >> "${TMP_FILE}"
    
    # Replace the old file with the new one
    mv "${TMP_FILE}" "${STATS_FILE}"
  else
    # Create new file with array containing this entry
    echo "[" > "${STATS_FILE}"
    echo "  ${NEW_ENTRY}" >> "${STATS_FILE}"
    echo "]" >> "${STATS_FILE}"
  fi
  
  # Python approach as alternative (more reliable but requires Python)
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, os
stats_file = '${STATS_FILE}'
new_entry = json.loads('${NEW_ENTRY}')
entries = []
if os.path.exists(stats_file):
    try:
        with open(stats_file, 'r') as f:
            entries = json.load(f)
    except Exception as e:
        print(f'Error reading stats: {e}')
        entries = []
entries.append(new_entry)
with open(stats_file, 'w') as f:
    json.dump(entries, f, indent=2)
print('Updated stats file with Python')
" || echo "Python update failed, using bash method instead"
  fi
  
  # Set status back to idle
  echo "idle" > "${STATUS_FILE}"
  
  # Update progress file with completion
  echo "Scraping completed at ${END_TIME_READABLE}" > "${PROGRESS_FILE}"
  echo "Duration: ${DURATION_FORMATTED}" >> "${PROGRESS_FILE}"
  echo "Exit code: ${RESULT}" >> "${PROGRESS_FILE}"
}

# Run the scraper in the background
start_scraping &

# Output confirmation message
echo "Scraping process started in background"

