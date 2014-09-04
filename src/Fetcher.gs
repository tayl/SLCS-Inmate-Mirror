function storeNewInmates() {
  var table = fetchInmateTable();
  if (table == null) {
    return;
  }
  var inmates = [];
  for (var i = 1; i < table.length; i++) {
    inmates.push(parseInmate(table[i]));
  }
  var sheet = SpreadsheetApp.openById("1PL0ileBIJvWb2l6l4-1vI1elKIPoGdrW_DmWlSEDG-I").getSheetByName("Database");
  var data = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 500), 2).getValues();
  var newData = [];
  for (var inmate in inmates) {
    if (!inArray(inmates[inmate], data, 500)) {
      newData.push([inmates[inmate].id, inmates[inmate].time.unix, "", "", JSON.stringify(inmates[inmate])]);
    }
  }
  if (newData.length > 0) {
    sheet.insertRowsBefore(2, newData.length);
    sheet.getRange(2, 1, newData.length, newData[0].length).setValues(newData);
    sheet.sort(2, false);        
  }
  profileUncheckedInmates();
  pullUnstoredImages();
}

function pullUnstoredImages() {
  var sheet = SpreadsheetApp.openById("1PL0ileBIJvWb2l6l4-1vI1elKIPoGdrW_DmWlSEDG-I").getSheetByName("Database");
  var range = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 500), sheet.getLastColumn());
  var data = range.getValues();
  var folder = null;
  var count = 0;
  for (var i = 1; i < data.length && count < 10; i++) {
    if (data[i][2] == "") {
      var json = JSON.parse(data[i][4]);
      if (json.image == undefined) {
        data[i][2] = "no url";
        continue;
      }
      if (folder == null) {
        folder = DriveApp.getFolderById("0B0M5bT18YZDCWFZYWF9sWk5WdUk");
      }
      data[i][2] = "yes";
      var filename = json.id + "-" + json.time.unix;
      var files = folder.getFilesByName(filename);
      if(files.hasNext()) {
        count++;
        continue;
      }
      var response = UrlFetchApp.fetch("http://www.stluciesheriff.com/" + json.image, {
                                       "muteHttpExceptions": true
                                       });
      Utilities.sleep(1000);
      var code = response.getResponseCode();
      if (code != 200) {
        data[i][2] = code;
        continue;
      }
      var blob = response.getAs(MimeType.JPEG).setName(filename);
      folder.createFile(blob);
      count++;
    }
  }
  if (count > 0) {
    range.setValues(data);
  }
}

function profileUncheckedInmates() {
  var sheet = SpreadsheetApp.openById("1PL0ileBIJvWb2l6l4-1vI1elKIPoGdrW_DmWlSEDG-I").getSheetByName("Database");
  var range = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 500), sheet.getLastColumn());
  var data = range.getValues();
  var count = 0;
  for (var i = 1; i < data.length && count < 20; i++) {
    if (data[i][3] != "yes") {
      var new_profile = fetchInmateProfile(data[i][0]);
      var old_profile = JSON.parse(data[i][4]);
      var updated_profile = merge_options(old_profile, new_profile);
      if(new_profile == null) {
        data[i][3] = "yes";
      } else if(updated_profile.agency == "" || updated_profile.charges.length == 0) {
        data[i][3] = increment(data[i][3]);
      } else {
        data[i][3] = "yes";
      }
      data[i][4] = JSON.stringify(updated_profile);
      count++;
    }
  }
  if (count > 0) {
    range.setValues(data);
  }
}

function increment(str) {
  if(str == "") {
    return "attempts: 1";
  }
  str = str.split(" ");
  var num = parseInt(str[1]);
  if(num == 10) {
    return "yes";
  }
  if(num++ < 10) {
    return "attempts: " + num;
  }
  return "";
}

/**
* Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
* @param obj1
* @param obj2
* @returns obj3 a new object based on obj1 and obj2
*/
function merge_options(obj1, obj2) {
  var obj3 = {};
  for (var attrname in obj1) {
    obj3[attrname] = obj1[attrname];
  }
  for (var attrname in obj2) {
    obj3[attrname] = obj2[attrname];
  }
  return obj3;
}

/**
* Checks haystack for needle with specified properties, not exceeding limit
* @param needle
* @param haystack
* @param limit
* @returns true or false, whether needle was found in haystack
*/
function inArray(needle, haystack, limit) {
  for (var element in haystack) {
    if (element > limit) {
      break;
    }
    if (needle.id == haystack[element][0] && needle.time.unix == haystack[element][1]) {
      return true;
    }
  }
  return false;
}

function fetchInmateTable() {
  var url = "http://www.stluciesheriff.com/inmate_list.php";
  var payload = {
    "First": "",
    "Last": "",
    "When": "2",
    "Submit": "Search"
  };
  var params = {
    "method": "POST",
    "muteHttpExceptions":true,
    "payload": payload
  }
  var response = UrlFetchApp.fetch(url, params);
  if (response.getResponseCode() != 200) {
    return null;
  }
  var contentText = response.getContentText();
  if (contentText.indexOf("Could not Connect to Database") != -1) {
    return null;
  }
  var xml = Xml.parse(contentText, true);
  return xml.html.body.table.tr[2].td[1].table.tr[4].td.table.tr;
}

function fetchInmateProfile(id) {
  var url = "http://www.stluciesheriff.com/inmate_profile.php?inmate_id=" + id;
  var response = UrlFetchApp.fetch(url, {
    "muteHttpExceptions": true
  });
  if (response.getResponseCode() != 200) {
    return null;
  }
  var xml = Xml.parse(response.getContentText(), true);
  var data = xml.html.body.table[0].tr[2].td[1].table.tr;
  var profile = parseInmateProfile(data);
  Utilities.sleep(1000);
  return profile;
}

function parseInmateProfile(data) {
  var names = parseNameString(data[3].td.strong.Text);
  if (names == null) {
    return null;
  }    
  var image_url = data[4].td.table.tr.td[0].a.img.src;
  var agency = data[4].td.table.tr.td[1].table.tr[3].td[1].Text || "";
  agency = agency.trim();
  var housing = data[4].td.table.tr.td[1].table.tr[6].td[1].Text.trim();
  var visitation = data[4].td.table.tr.td[1].table.tr[7].td[1].Text.trim();
  var release = data[4].td.table.tr.td[1].table.tr[8].td[1].Text.trim();
  var charges = parseChargesTable(data[5].td.table.tr);
  
  var profile = {};
  if(image_url.indexOf("no_photo") == -1) {
    profile.image = image_url;
  }
  profile.agency = agency;
  profile.housing = housing;
  profile.visitation = visitation;
  profile.release = release;
  profile.charges = charges;
  return profile;
}

function parseChargesTable(data) {
  var charges = [];
  for (var i = 2; i < data.length; i++) {
    var desc = data[i].td[0].Text;
    var bond = data[i].td[2].Text;
    if (desc == undefined || bond == undefined) {
      continue;
    }
    var charge = {
      "desc": desc.trim(),
      "bond": bond.trim()
    };
    charges.push(charge);
  }
  return charges;
}

String.prototype.toProperCase = function() {
  return this.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

function parseNameString(name) {
  if (name == "" || name == null) {
    return null;
  }
  var name = name.split(/,/g);
  var names = {};
  names.last = name[0].toProperCase();
  name = name[1].trim().split(" ");
  names.first = name[0].toProperCase();
  name = name.slice(1, name.length).join(" ");
  names.middle = name.toProperCase();
  return names;
}

//function parseNameString(name) {
//  if (name == "" || name == null) {
//    return null;
//  }
//  var name = name.replace(/,/g, "").split(/ /);
//  var names = {};
//  names.last = name[0];
//  names.first = name[1];
//  name = name.slice(2, name.length).join(/ /);
//  names.middle = name;
//  return names;
//}

function parseDobString(dob) {
  if(dob == null || dob == undefined) {
    return null;
  }
  var dobArray = dob.split(/-/);
  var dob = {};
  dob.year = dobArray[2];
  dob.month = dobArray[0];
  dob.day = dobArray[1];
  dob.unix = new Date(dob.year, parseInt(dob.month, 10) - 1, dob.day).getTime();
  return dob;
}

function parseTimeString(time) {
  var dateArray = time.match(/(\d+)-(\d+)-(\d+)/g)[0].split(/-/);
  var timeArray = time.match(/(\d+):(\d+)/g)[0].split(/:/);
  var time = {};
  time.year = dateArray[2];
  time.month = dateArray[0];
  time.day = dateArray[1];
  time.hour = timeArray[0];
  time.min = timeArray[1];
  time.unix = new Date(time.year, parseInt(time.month, 10) - 1, time.day, time.hour, time.min).getTime();
  return time;
}

function parseInmate(data) {
  var names = parseNameString(data.td[0].a.Text);
  var dob = parseDobString(data.td[1].Text);
  var time = parseTimeString(data.td[4].Text);
  var inmate = {
    "name": names,
    "dob": dob,
    "age": data.td[2].Text,
    "id": data.td[3].Text,
    "time": time
  };
  return inmate;
}