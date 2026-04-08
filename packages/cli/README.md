# @soda3js/cli

Terminal client for the [Socrata SODA3 API](https://dev.socrata.com/). Query, explore, and export open data from the command line.

## Install

```bash
npm install -g @soda3js/cli
```

## Setup

Initialize a config file with your default Socrata portal:

```bash
soda3 config init --domain data.sfgov.org
soda3 config init --domain data.sfgov.org --token YOUR_APP_TOKEN
```

Configuration is stored at `~/.config/soda3js/config.toml` (respects `XDG_CONFIG_HOME`).

### Configuration File

```toml
default_profile = "sf"

[cache]
enabled = true
ttl = 300

[profiles.sf]
domain = "data.sfgov.org"
token = "your-app-token"

[profiles.nyc]
domain = "data.cityofnewyork.us"
```

### Add Profiles

```bash
soda3 config add-profile nyc --domain data.cityofnewyork.us --token YOUR_TOKEN
soda3 config show
soda3 config edit
```

## Commands

### soda3 query

Query a dataset with structured options or raw SoQL.

```bash
# Basic query
soda3 query yitu-d5am --select title,release_year,locations --limit 10

# With filtering and sorting
soda3 query yitu-d5am \
  --select title,release_year \
  --where "release_year >= 2020" \
  --order release_year:DESC \
  --limit 5

# Aggregation with group-by
soda3 query yitu-d5am \
  --select "locations, count(*) as film_count" \
  --group-by locations \
  --order film_count:DESC \
  --limit 10

# Raw SoQL (bypasses structured options)
soda3 query yitu-d5am --q "title, release_year WHERE release_year > 2015 LIMIT 5"

# Override domain for a single query
soda3 query erm2-nwe9 --domain data.cityofnewyork.us --limit 5

# Use a named profile
soda3 query yitu-d5am --profile sf --limit 10
```

#### Output Formats

```bash
soda3 query yitu-d5am --limit 5 --format table   # default for small result sets
soda3 query yitu-d5am --limit 5 --format json     # JSON array
soda3 query yitu-d5am --limit 5 --format ndjson   # newline-delimited JSON
soda3 query yitu-d5am --limit 5 --format csv      # CSV
```

#### Pipe to jq

```bash
soda3 query yitu-d5am --limit 5 --format json | jq '.[].title'
soda3 query yitu-d5am --format ndjson | jq -r '.title' | head -20
```

### soda3 search

Search the Socrata open data catalog for datasets.

```bash
# Search by keyword
soda3 search "film locations"

# Filter to a specific domain
soda3 search "crime" --domain data.cityofnewyork.us

# Limit results
soda3 search "transportation" --limit 5

# JSON output for scripting
soda3 search "parks" --format json | jq '.[].resource.name'

# NDJSON for streaming
soda3 search "health" --format ndjson
```

### soda3 meta

Fetch and display dataset metadata.

```bash
soda3 meta yitu-d5am
soda3 meta yitu-d5am --format json
soda3 meta yitu-d5am --format json | jq '.columns[].fieldName'
```

### soda3 export

Export a full dataset as CSV or JSON.

```bash
# Stream to stdout
soda3 export yitu-d5am

# Write to file
soda3 export yitu-d5am --output films.csv
soda3 export yitu-d5am --format json --output films.json
```

### soda3 cache

Manage the local response cache.

```bash
soda3 cache status
soda3 cache inspect yitu-d5am
soda3 cache clear
soda3 cache prune --max-age 7d
```

### soda3 config

Manage configuration profiles.

```bash
soda3 config init --domain data.sfgov.org --token YOUR_TOKEN
soda3 config show
soda3 config edit
soda3 config add-profile nyc --domain data.cityofnewyork.us
```

## Cache Control

Caching is enabled by default using the filesystem cache (`~/.cache/soda3js`). Override per-request:

```bash
soda3 query yitu-d5am --no-cache --limit 10
soda3 query yitu-d5am --cache-ttl 60 --limit 10
```

## License

[MIT](./LICENSE)
