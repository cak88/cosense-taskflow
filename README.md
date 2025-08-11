# Cosense Taskflow

A web application for visualizing and editing Scrapbox task data in an interactive kanban-style interface.

## Overview

Cosense Taskflow loads JSON data exported from Scrapbox and displays task information in an interactive kanban-style interface. You can edit tasks directly in the interface and export the changes back to Scrapbox format, enabling bidirectional task management.

## Features

✅ **Scrapbox Data Loading**
- Load JSON files via drag & drop or file selection
- Automatic parsing of Scrapbox notation to extract task information
- Real-time API integration with Scrapbox backup endpoints

**Task Recognition**:
- Pages containing `[leaves.icon]` are recognized as tasks
- Pages with `#Exclude` or `[Exclude]` tags are excluded
- Configurable tag recognition settings

✅ **3-Level Responsive Design**
- **Small screens (<512px)**: Ultra-compact card format
- **Medium screens (512px-1024px)**: Card format with start/due dates
- **Desktop (1025px+)**: Horizontal list format
- Highlight display for high importance/urgency tasks

✅ **Advanced Filtering & Sorting**
- Filter by project, status, stage, and assignee
- Smart sort (due date → importance/urgency → status)
  - **Level 1: Due date order** (no due date = lowest priority)
  - **Level 2: Importance/urgency** (#Importance_high, #Urgency_high, [Importance_high], [Urgency_high])
  - **Level 3: Status order** (inProgress → waiting → review → notStarted → completed)
  - **Level 4: Fallback** (updated date, newest first)
- Show/hide completed and inactive tasks
- Project-specific filtering including \"No Project\" option

✅ **Real-time Task Editing**
- Direct editing of status, stage, and assignee in the interface
- Visual feedback for modified tasks
- Conflict detection and resolution for simultaneous edits
- Automatic backup and caching system

✅ **Scrapbox Integration**
- Real-time data fetching from Scrapbox backup API
- Intelligent caching system to avoid rate limits
- Automatic detection of new backups
- Configurable authentication and project settings

✅ **Export & Import**
- Export modified tasks to Scrapbox-compatible JSON
- Flexible filename formats with project name placeholders
- Optional automatic data fetching before export
- Direct integration with Scrapbox import interface

## Getting Started

### Method 1: File Upload
1. Export your Scrapbox project data as JSON
2. Open `index.html` in a web browser
3. Use the file upload button or drag & drop your JSON file
4. Tasks will be automatically extracted and displayed

### Method 2: API Integration
1. Open the settings panel (gear icon)
2. Configure your Scrapbox project name
3. Add authentication token if needed
4. Click \"Fetch Latest Data\" to load tasks directly from Scrapbox

### Sample Data
Try the application with the included `data/sample.json` file to see how it works.

## Task Format

Tasks are identified by the presence of `[leaves.icon]` in Scrapbox pages. The following formats are recognized:

```
Task Title
[leaves.icon] [2025-01-01] ID:[task-001]
[stem.icon][Project Name] [Assigned to user]
[Status_inProgress] [Stage_active]
Start Date [2025-01-01] Due Date [2025-01-15]
[Context_work] [Importance_high] [Urgency_normal]

Task description goes here...
```

### Status Options
- `Status_notStarted` - Not started
- `Status_inProgress` - In progress
- `Status_waiting` - Waiting (external dependencies)
- `Status_review` - Under review
- `Status_completed` - Completed

### Stage Options
- `Stage_active` - Active tasks
- `Stage_inactive` - Inactive/on-hold tasks (hidden by default)
- `Stage_someday` - Someday/maybe tasks
- `Stage_temp` - Temporary tasks

## Configuration

### Task Recognition Settings
Configure which tags are recognized for status, stage, and assignee detection:
- Status Tags: Comma-separated list of status identifiers
- Stage Tags: Comma-separated list of stage identifiers  
- Assignee Tags: Comma-separated list of assignee identifiers
- Exclude Tags: Tasks with these tags will be hidden

### API Settings
- **Auto Fetch**: Automatically fetch new data at regular intervals
- **Initial Fetch**: Fetch data when the application loads
- **Fetch Interval**: How often to check for new data (in seconds)
- **Authentication**: Scrapbox cookie token for private projects

### Export Settings
- **Filename Format**: Template for exported filenames (supports PROJECT placeholder)
- **Fetch Before Export**: Update data before exporting changes
- **Open Import Page**: Automatically open Scrapbox import interface

## Development

### Local Development
1. Start a local web server in the project directory:
   ```bash
   python -m http.server 3000
   ```
2. For Scrapbox API integration, also run the proxy server:
   ```bash
   cd server
   python proxy.py
   ```

### File Structure
```
├── index.html          # Main application
├── css/
│   └── styles.css     # Application styles
├── js/
│   ├── main.js        # Application initialization
│   ├── config.js      # Configuration settings
│   ├── data.js        # Data processing
│   ├── ui.js          # UI rendering
│   ├── filters.js     # Filtering and sorting
│   ├── export.js      # Export functionality
│   ├── settings.js    # Settings management
│   ├── merge-manager.js # Conflict resolution
│   └── scrapbox-api.js # Scrapbox API integration
├── server/
│   ├── proxy.py       # CORS proxy for local development
│   └── app.py         # Flask server for deployment
└── data/
    └── sample.json    # Sample data for testing
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (recent versions)
- Mobile browsers on iOS and Android

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues or have questions:
1. Check the sample data format
2. Verify your Scrapbox data export format
3. Open an issue on GitHub with details about your setup

---

Built with vanilla JavaScript for maximum compatibility and performance.