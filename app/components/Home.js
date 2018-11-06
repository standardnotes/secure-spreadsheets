import React from 'react';
import ComponentManager from 'sn-components-api';

export default class Home extends React.Component {

  constructor(props) {
    super(props);

    this.state = {};

    this.connectToBridge();

    this.numRows = 75;
    this.numColumns = 26;
  }

  componentDidMount() {
    $(function() {
      $("#spreadsheet").kendoSpreadsheet({
        rows: this.numRows,
        columns: this.numColumns,
        change: this.onChange,
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
        insertColumn: () => {
          var workbook = this.getJSON();
          workbook.columns = ++this.numColumns;
          this.getSpreadsheet().fromJSON(workbook);
          this.onChange();
        },
        insertRow: (event) => {
          var workbook = this.getJSON();
          workbook.rows = ++this.numRows;
          this.getSpreadsheet().fromJSON(workbook);
          this.onChange();
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

      // theme chooser dropdown
      this.initThemePicker();
    }.bind(this));
  }

  initThemePicker() {
    // k-spreadsheet-sheets-bar
    $(".theme-chooser").kendoDropDownList({
      dataSource: [
        { text: "Black", value: "black" },
        { text: "Blue Opal", value: "blueopal" },
        { text: "Bootstrap", value: "bootstrap" },
        { text: "Fiori", value: "fiori" },
        { text: "Default", value: "default" },
        { text: "Material", value: "material" },
        { text: "Material Black", value: "materialblack" },
        { text: "Nova", value: "nova" },
        { text: "Office", value: "office365" },
        { text: "Metro", value: "metro" },
        { text: "Metro Black", value: "metroblack" },
        { text: "Silver", value: "silver" },
        { text: "Flat", value: "flat" },
        { text: "Uniform", value: "uniform" },
        { text: "Moonlight", value: "moonlight" },
        { text: "High Contrast", value: "highcontrast" },
      ],
      dataTextField: "text",
      dataValueField: "value",
      change: (e) => {
        var theme = (e.sender.value() || "default").toLowerCase();
        this.changeTheme(theme, false);
      }
    });

    $(".theme-chooser-container").appendTo(".k-spreadsheet-sheets-bar");
  }

  // loads new stylesheet
  changeTheme(skinName, animate) {
    var skinsWithCommon = ["bootstrap", "fiori", "material", "nova", "office365"];
    var hasCommon = skinsWithCommon.includes(skinName);

    var doc = document,
        kendoLinks = $("link[href*='kendo.']"),
        commonLink = kendoLinks.filter("[href*='kendo.common']"),
        skinLink = kendoLinks.filter(":not([href*='kendo.common'])"),
        href = location.href,
        skinRegex = /kendo\.\w+(\.min)?\.css/i,
        extension = skinLink.attr("rel") === "stylesheet" ? ".css" : ".less",
        newSkinUrl = skinLink.attr("href").replace(skinRegex, "kendo." + skinName + "$1" + extension),
        commonRegex = /kendo\.(.)+(\.min)?\.css/i;

    var newCommonUrl;
    if(hasCommon) {
      newCommonUrl = commonLink.attr("href").replace(commonRegex, "kendo.common-" + skinName + "$2" + ".min" + extension);
    } else {
      newCommonUrl = commonLink.attr("href").replace(commonRegex, "kendo.common" + ".min" + extension);
    }

    function preloadStylesheet(file, callback) {
      var element = $("<link rel='stylesheet' href='" + file + "' \/>").appendTo("head");

      setTimeout(function () {
        callback();
        element.remove();
      }, 100);
    }

    function replaceTheme() {
      var browser = kendo.support.browser,
          oldSkinName = $(doc).data("kendoSkin"),
          newLink;

      if (browser.msie && browser.version < 10) {
        newLink = doc.createStyleSheet(newSkinUrl);
      } else {
        var newCommonLink = commonLink.eq(0).clone().attr("href", newCommonUrl);
        newCommonLink.insertBefore(commonLink[0]);
        newLink = skinLink.eq(0).clone().attr("href", newSkinUrl);
        newLink.insertBefore(skinLink[0]);
      }

      commonLink.remove();
      skinLink.remove();

      $(doc.documentElement).removeClass("k-" + oldSkinName).addClass("k-" + skinName);
    }

    if(animate) {
      preloadStylesheet(newSkinUrl, replaceTheme);
    } else {
      replaceTheme();
    }
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
    this.componentManager.saveItemWithPresave(this.note, () => {
      this.note.content.preview_html = null;
      this.note.content.preview_plain = "Created with Spreadsheets";

      var json = this.getJSON();
      var content = JSON.stringify(json);
      this.note.content.text = content;
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
