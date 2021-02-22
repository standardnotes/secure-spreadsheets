import React from 'react';
import ComponentManager from 'sn-components-api';

export default class Home extends React.Component {

  constructor(props) {
    super(props);

    this.state = {};

    this.connectToBridge();

    this.numRows = 75;
    this.numColumns = 26;
    this.needsDimensionUpdate = false;
  }

  componentDidMount() {
    $(function() {
      $("#spreadsheet").kendoSpreadsheet({
        rows: this.numRows,
        columns: this.numColumns,
        change: this.onChange,
        render: () => { 
          if(this.needsDimensionUpdate) {
            // make sure this only recreates the sheet once per dimension change
            this.needsDimensionUpdate = false;

            // rebuild the spreadsheet off current data
            this.getSpreadsheet().fromJSON(this.getJSON());

            // make sure to save to note
            this.onChange();
          }
        },
        changeFormat: this.onChange, // triggered when cell structure changes (currency, date, etc)
        excelImport: (event) => {
          // Excel import functionality has been disabled completely.
          // We'll keep this code around below incase we enable it again in the future.
          if(!confirm("Importing will completely overwrite any existing data. Are you sure you want to continue?")) {
            event.preventDefault();
            return;
          }

          if(!confirm("Note that importing from Excel may cause very large file sizes within Standard Notes, which may affect performance. You may continue with import, but if you notice performance issues, it is recommended you manually import data instead.")) {
            event.preventDefault();
            return;
          }

          event.promise.done(() => {
            console.log("Import complete");
            this.onChange();
          })

        },
        insertSheet: this.onChange,
        removeSheet: this.onChange,
        renameSheet: this.onChange,
        unhideColumn: this.onChange,
        unhideRow: this.onChange,
        hideColumn: this.onChange,
        hideRow: this.onChange,
        deleteColumn: this.onChange,
        deleteRow: this.onChange,
        insertColumn: (event) => {
          this.numColumns += 1;
          this.needsDimensionUpdate = true;
        },
        insertRow: (event) => {
          this.numRows += 1;
          this.needsDimensionUpdate = true;
        }
      });

      this.reloadSpreadsheetContent();

      $(".k-item, .k-button").click((e) => {
        setTimeout(() => {
          this.onChange();
        }, 10);
      });

      // remove import option
      $(".k-upload-button").remove();
    }.bind(this));
  }

  getSpreadsheet() {
    return $("#spreadsheet").getKendoSpreadsheet();
  }

  onChange = (event) => {
    if(!this.note) {
      return;
    }

    this.saveSpreadsheet();
  }

  saveSpreadsheet() {
    // Be sure to capture this object as a variable, as this.note may be reassigned in `streamContextItem`, so by the time
    // you modify it in the presave block, it may not be the same object anymore, so the presave values will not be applied to
    // the right object, and it will save incorrectly.
    let note = this.note;

    this.componentManager.saveItemWithPresave(note, () => {
      note.content.preview_html = null;
      note.content.preview_plain = "Created with Secure Spreadsheets";

      var json = this.getJSON();
      var content = JSON.stringify(json);
      note.content.text = content;
    });
  }

  getJSON() {
    var json = this.getSpreadsheet().toJSON();
    json.rows = this.numRows;
    json.columns = this.numColumns;
    return json;
  }

  connectToBridge() {
    var permissions = [
      {
        name: "stream-context-item"
      }
    ]

    this.componentManager = new ComponentManager(permissions, () => {
      // on ready
      var platform = this.componentManager.platform;
      if(platform) {
        document.body.classList.add(platform);
      }
    });

    // componentManager.loggingEnabled = true;

    this.componentManager.streamContextItem((note) => {
      this.note = note;

       // Only update UI on non-metadata updates.
      if(note.isMetadataUpdate) {
        return;
      }

      this.reloadSpreadsheetContent();
    });
  }

  reloadSpreadsheetContent() {
    if(!this.note) {
      return;
    }

    var text = this.note.content.text;
    if(text.length == 0) {
      return;
    }

    var json = JSON.parse(text);
    if(json.rows) { this.numRows = json.rows; }
    if(json.columns) { this.numColumns = json.columns; }
    this.getSpreadsheet().fromJSON(json);
  }

  render() {
    return (
      <div></div>
    )
  }
}
