# Graph Report - .  (2026-09-07)

## Corpus Check
- 121 files · ~99,102 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 545 nodes · 911 edges · 40 communities (33 shown, 7 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Neon UI Component Kit
- Frontend Package & Build Config
- Network Topology Rendering
- Pydantic Models & Report Generation
- Scan Results & Host Views
- Preset & History Persistence
- TypeScript App Compiler Config
- Frontend Runtime Dependencies
- Scan Scheduling (APScheduler)
- App Bootstrap & Deployment
- TypeScript Node Compiler Config
- Nmap Knowledge Base
- API Client & Scan Polling
- TCP Port Checker
- Scan Execution Pipeline
- Vulnerability Aggregation
- Scan Comparison & Diff
- Analytics Endpoints
- Linting & Vite Config
- App Shell & Dashboards
- Command Explainer UI
- Scan Configuration Form
- History List (Virtualized)
- Preset Form Modal
- Schedule Form Modal
- Per-Scan Vulnerability Query
- Scan Cancellation
- Host Card Component
- Preset Manager Component
- Schedule List Component
- Scan Details Page
- Root TSConfig References
- Command Explainer Types
- Scan Compare Types
- Topology Graph Types

## God Nodes (most connected - your core abstractions)
1. `react` - 35 edges
2. `get_db()` - 30 edges
3. `compilerOptions` - 19 edges
4. `compilerOptions` - 15 edges
5. `run_scan()` - 13 edges
6. `transitions` - 11 edges
7. `parse_nmap_xml()` - 9 edges
8. `REST API (/api/* endpoints)` - 9 edges
9. `get_scan_by_id()` - 8 edges
10. `generate_report()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `APScheduler Cron Scheduling` --references--> `get_schedules()`  [INFERRED]
  Readme.md → backend/app/database.py
- `CVE Extraction from NSE vuln Scripts` --shares_data_with--> `parse_nmap_xml()`  [INFERRED]
  Readme.md → backend/app/nmap_wrapper.py
- `Nmap XML Parsing (xmltodict)` --references--> `parse_nmap_xml()`  [INFERRED]
  Readme.md → backend/app/nmap_wrapper.py
- `Scan Lifecycle (BackgroundTasks + polling)` --references--> `run_scan()`  [INFERRED]
  Readme.md → backend/app/nmap_wrapper.py
- `Screenshot: Knowledge Base Tab (yellow theme)` --conceptually_related_to--> `Green / Yellow Theme Toggle`  [INFERRED]
  image-2.png → Readme.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **FastAPI Backend Module Map** — backend_app_main, backend_app_database, backend_app_nmap_wrapper, backend_app_scheduler, backend_app_report_generator, backend_app_knowledge_base, backend_app_models [EXTRACTED 1.00]
- **Scan Execution Flow (request → nmap → parse → DB → poll)** — readme_scan_lifecycle, backend_app_routes_scan, backend_app_nmap_wrapper_run_scan, backend_app_nmap_wrapper_parse_nmap_xml, backend_app_database_save_scan, nmap_panel_src_hooks_usescan [INFERRED 0.85]
- **Topology Rendering Modes** — nmap_panel_src_components_topologygraph_topologygraph, nmap_panel_src_components_topologygraph_modes_topologygraphd3, nmap_panel_src_components_topologygraph_modes_topologygrid, nmap_panel_src_components_topologygraph_modes_topologytree, nmap_panel_src_components_topologygraph_modes_topologytable [EXTRACTED 1.00]

## Communities (40 total, 7 thin omitted)

### Community 0 - "Neon UI Component Kit"
Cohesion: 0.05
Nodes (45): Avatar(), getInitials(), AvatarProps, BackgroundEffects(), GlitchText(), GlitchTextProps, IndustrialModal(), IndustrialModalProps (+37 more)

### Community 1 - "Frontend Package & Build Config"
Cohesion: 0.05
Nodes (39): description, devDependencies, react, react-dom, @types/node, @types/react, @types/react-dom, typescript (+31 more)

### Community 2 - "Network Topology Rendering"
Cohesion: 0.07
Nodes (31): build_nmap_args(), Собирает аргументы командной строки для nmap на основе параметров., extract_topology_from_xml(), get_topology(), Any, Извлекает из XML данные traceroute для построения графа.     Возвращает словарь, Возвращает данные для построения графа топологии.     Сначала пытается извлечь t, Screenshot: Scan Tab with Topology Graph (+23 more)

### Community 3 - "Pydantic Models & Report Generation"
Cohesion: 0.11
Nodes (27): HostInfo, PortInfo, BaseModel, ScanOptions, ScanRequest, ScanStatus, parse_nmap_xml(), Обновляет статус сканирования в памяти. (+19 more)

### Community 4 - "Scan Results & Host Views"
Cohesion: 0.10
Nodes (16): Screenshot: Scan Tab Results (green theme), HostDetailsModal(), HostDetailsModalProps, getSubnet(), HostGrid(), HostGridProps, ScanProgress(), ScanProgressProps (+8 more)

### Community 5 - "Preset & History Persistence"
Cohesion: 0.14
Nodes (24): create_preset(), create_schedule(), delete_preset(), delete_scan(), delete_schedule(), get_db(), get_preset(), get_presets() (+16 more)

### Community 6 - "TypeScript App Compiler Config"
Cohesion: 0.08
Nodes (25): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+17 more)

### Community 7 - "Frontend Runtime Dependencies"
Cohesion: 0.08
Nodes (25): add, axios, chart.js, cytoscape, cytoscape-dagre, d3, motion, dependencies (+17 more)

### Community 8 - "Scan Scheduling (APScheduler)"
Cohesion: 0.15
Nodes (21): get_schedule(), get_schedules(), create_schedule_endpoint(), delete_schedule_endpoint(), get_schedule_by_id(), list_schedules(), BaseModel, run_schedule_now() (+13 more)

### Community 9 - "App Bootstrap & Deployment"
Cohesion: 0.12
Nodes (14): PyInstaller (standalone packaging), Compose Service: backend (FastAPI, :5000), Bind-Mounted nmap_panel.db Volume, Compose Service: nginx (SPA + reverse proxy, :80), SPA Entry HTML (index.html), Theme, ThemeContext, ThemeProvider() (+6 more)

### Community 10 - "TypeScript Node Compiler Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 11 - "Nmap Knowledge Base"
Cohesion: 0.16
Nodes (13): explain_command(), get_options(), parse_nmap_command(), Any, Разбирает строку команды nmap, возвращает список найденных флагов с их аргумента, Принимает команду nmap, возвращает расшифровку каждого флага., Screenshot: Knowledge Base Tab (yellow theme), KnowledgeBase() (+5 more)

### Community 12 - "API Client & Scan Polling"
Cohesion: 0.15
Nodes (14): HostInfo, KnowledgeOption, nmapApi, PortCheckRequest, PortCheckResponse, PortCheckResult, PortInfo, Preset (+6 more)

### Community 13 - "TCP Port Checker"
Cohesion: 0.19
Nodes (12): check_port(), check_ports(), PortCheckRequest, PortCheckResult, BaseModel, Проверяет один порт с помощью асинхронного TCP-соединения., Проверяет список портов на указанном хосте., parsePorts() (+4 more)

### Community 14 - "Scan Execution Pipeline"
Cohesion: 0.15
Nodes (13): get_host_id_by_ip(), Сохраняет хосты и порты из распарсенных данных в БД., Возвращает id хоста по scan_id и ip., save_scan(), store_scan_hosts(), get_scan_status(), Запускает nmap в подпроцессе, сохраняет XML, парсит и обновляет статус., run_scan() (+5 more)

### Community 15 - "Vulnerability Aggregation"
Cohesion: 0.17
Nodes (11): get_all_vulnerabilities(), get_vulnerability_stats(), Сохраняет список уязвимостей в БД., Возвращает все уязвимости из всех сканов с пагинацией., Агрегированная статистика по уязвимостям., store_vulnerabilities(), get_all_vulns(), get_stats() (+3 more)

### Community 16 - "Scan Comparison & Diff"
Cohesion: 0.18
Nodes (11): get_hosts_by_scan(), Возвращает список хостов с портами для заданного scan_id., compare_scans(), compute_diff(), Any, Сравнивает два списка хостов и возвращает структуру diff., Axios API Client Boundary, Database Schema (scans/hosts/ports/vulns) (+3 more)

### Community 17 - "Analytics Endpoints"
Cohesion: 0.25
Nodes (10): get_os_distribution(), get_overview(), get_timeline(), get_top_ports(), get_top_services(), Any, Количество хостов и открытых портов по дням за последние N дней., Общая статистика: количество сканов, хостов, портов, уязвимостей. (+2 more)

### Community 18 - "Linting & Vite Config"
Cohesion: 0.18
Nodes (9): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, Vite React Template Notes, oxc, typescript (+1 more)

### Community 19 - "App Shell & Dashboards"
Cohesion: 0.24
Nodes (8): App(), Screen, AnalyticsDashboard(), DiffHost, DiffResult, ScanCompare(), useScan(), Analytics Dashboard

### Community 20 - "Command Explainer UI"
Cohesion: 0.28
Nodes (6): CommandExplainer(), ExplainedFlag, ExplainResponse, NeonInput(), NeonInputProps, react

### Community 21 - "Scan Configuration Form"
Cohesion: 0.47
Nodes (4): ScanRequest, profiles, ScanConfig(), ScanConfigProps

### Community 22 - "History List (Virtualized)"
Cohesion: 0.50
Nodes (3): HistoryList(), HistoryListProps, react-virtuoso List Virtualization

### Community 23 - "Preset Form Modal"
Cohesion: 0.50
Nodes (3): PresetFormModal(), profiles, PresetFormModalProps

### Community 24 - "Schedule Form Modal"
Cohesion: 0.50
Nodes (3): profiles, ScheduleFormModal(), ScheduleFormModalProps

### Community 25 - "Per-Scan Vulnerability Query"
Cohesion: 0.50
Nodes (4): get_vulnerabilities_by_scan(), Возвращает все уязвимости для данного скана с информацией о хосте., get_scan_vulnerabilities(), Получить все уязвимости для конкретного скана.

### Community 26 - "Scan Cancellation"
Cohesion: 0.50
Nodes (4): update_scan(), cancel_scan(), Отменяет сканирование., cancel()

### Community 30 - "Scan Details Page"
Cohesion: 0.50
Nodes (3): ScanDetailsPage(), ScanDetailsPageProps, TabId

## Knowledge Gaps
- **113 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Command Explainer UI` to `Neon UI Component Kit`, `Network Topology Rendering`, `Scan Results & Host Views`, `App Bootstrap & Deployment`, `Nmap Knowledge Base`, `API Client & Scan Polling`, `TCP Port Checker`, `Linting & Vite Config`, `App Shell & Dashboards`, `Scan Configuration Form`, `History List (Virtualized)`, `Preset Form Modal`, `Schedule Form Modal`, `Host Card Component`, `Preset Manager Component`, `Schedule List Component`, `Scan Details Page`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `Cyberpunk / Neon-Acid UI Design` connect `Scan Results & Host Views` to `Neon UI Component Kit`, `App Bootstrap & Deployment`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `Nmap Panel (Web Application)` connect `App Bootstrap & Deployment` to `Scan Comparison & Diff`, `Scan Results & Host Views`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `get_db()` (e.g. with `get_os_distribution()` and `get_overview()`) actually correct?**
  _`get_db()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `run_scan()` (e.g. with `get_host_id_by_ip()` and `save_scan()`) actually correct?**
  _`run_scan()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Neon UI Component Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.05420054200542006 - nodes in this community are weakly interconnected._