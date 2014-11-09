function updateListing() {
  var sheet = SpreadsheetApp.openById("1PL0ileBIJvWb2l6l4-1vI1elKIPoGdrW_DmWlSEDG-I");
  var db = sheet.getSheetByName("Database");
  var db_range = db.getRange(1, 1, Math.min(db.getLastRow(), 100), db.getLastColumn());
  var db_data = db_range.getValues();
  var listing = sheet.getSheetByName("Listing");
  var listing_range = listing.getRange(1, 1, Math.min(db.getLastRow(), 100), listing.getLastColumn());
  var listing_data = listing_range.getValues();
  for(var i = 1; i < db_data.length; i++) {
    var data = JSON.parse(db_data[i][4]);
    if(db_data[i][2] == "yes") {
      listing_data[i][0] = '=IMAGE("https://googledrive.com/host/0B0M5bT18YZDCWFZYWF9sWk5WdUk/' + data.id + '-' + data.time.unix + '.jpg",1)';
    } else {
      listing_data[i][0] = "no image available";
    }
    if(data.name.middle == "") {
      listing_data[i][1] = data.name.first + " " + data.name.last;
    } else {
      listing_data[i][1] = data.name.first + " " + data.name.middle + " " + data.name.last;
    }
    listing_data[i][2] = data.age || "-";
    if(data.dob == null) {
      listing_data[i][3] = "-";
    } else {
      listing_data[i][3] = new Date(data.dob.unix);
    }
    listing_data[i][4] = new Date(data.time.unix);
    listing_data[i][5] = data.agency || "-";
    var charges = "";
    for(var charge in data.charges) {
      charges += (parseInt(charge) + 1) + ". ";
      charges += data.charges[charge].desc;
      if(charge < data.charges.length - 1) {
        charges += "\n";
      }
    }
    listing_data[i][6] = charges || "-";
  }
  listing_range.setValues(listing_data);
}