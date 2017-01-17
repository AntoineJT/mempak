(function MPKApp() {
	var App = {};

	App.usefsys = location.protocol === "chrome-extension:";
	App.codeDB = {};

	var elem = MPKEdit.elem;

	var origin, out;

	var enter = function(event) {
		if(!origin || origin.nodeName !== "TR") {return false;}
		if(event.target.nodeName !== "TD") {return false;}

		var dest = event.target.parentNode;
		if(origin.previousSibling === dest) {
			origin.parentNode.insertBefore(origin, dest);
		} else  {
			origin.parentNode.insertBefore(origin, dest.nextSibling);
		}
	}

	var start = function(event) {
		if(event.target.nodeName === "TR") { // only drag tablerows
			if(event.ctrlKey) {
				event.dataTransfer.setData("text","null"); //Firefox drag fix
				window.getSelection().removeAllRanges(); //remove text selection
				origin = event.target;
				origin.style.opacity = 0.75;
				origin.style.outline = "2px solid";
				// Compare rows at start
				var trs = document.querySelectorAll("tr");
				for(var arr = [], i = 0; i < trs.length; i++) {
					arr.push(trs[i].id);
				}
				out = arr;
			} else {
				MPKEdit.State.saveNote(event.target.id, event);
			}
		}
	}

	var end = function() {
		if(!origin || origin.nodeName !== "TR") {return false;}
		origin.style.opacity = 1;
		origin.style.outline = "none";
		origin = undefined;
		// Compare rows at end
		var trs = document.querySelectorAll("tr");
		for(var arr = [], i = 0; i < trs.length; i++) {
			arr.push(trs[i].id);
		}
		for (var i = 0,d=0; i < out.length; i++) {
			if (out[i] === arr[i]) { d++;}
		}
		if(out.length === d) {
			console.log("No changes detected");
			return false;
		}


		var tmp = new Uint8Array(MPKEdit.State.data);
		for(var i = 0x300; i < 0x500; i += 32) {
			var p = 0x300+(32*arr[(i-0x300)/32]);
			for(var j = 0; j < 32; j++) {
				tmp[i+j] = MPKEdit.State.data[p+j];
			}
		}
		MPKEdit.Parser(tmp);
	}

	var browse = function() {
		if(App.usefsys) {
			MPKEdit.fsys.loadFile();
		}
		else {
			var selectFile = document.getElementById("fileOpen");
			selectFile.onchange = readFiles;
			selectFile.click();

			selectFile.parentElement.replaceChild(elem(["input", {
				id: "fileOpen",
				type: "file",
				multiple: true
			}]), selectFile);
		}
	};

	var readFiles = function(event) {
		var files = event.target.files || event.dataTransfer.files;

		for(var i = 0; i < files.length; i++) {
			var reader = new FileReader();
			reader._filename = files[i].name;
			reader.onload = MPKEdit.Parser;

			if(App.usefsys) {
				App.tmpEntry = event.dataTransfer.items[i].webkitGetAsEntry();
			}
			reader.readAsArrayBuffer(files[i].slice(0, 36928));
		}
		event.preventDefault();
	};

	var buildRow = function(i) {
		var gameCode = MPKEdit.State.NoteTable[i].serial;
		var gameName = App.codeDB[gameCode] || gameCode;
		var publishr = App.pubDB[MPKEdit.State.NoteTable[i].publisher] || "{{Unknown: "+MPKEdit.State.NoteTable[i].publisher+"}}";
		var tableRow =
		elem(["tr",{id:i, draggable: true,  ondragenter:enter, ondragstart:start, ondragend:end}],
			elem(["td", {className:"h4sh"}],
				elem(["canvas",{width:30,height:30,className:"hash"}])
			),
			elem(["td", {className:"name",innerHTML:MPKEdit.State.NoteTable[i].noteName}],
				elem(["div", gameName + " &mdash; " + publishr])
			),

			elem(["td", {className:"region",innerHTML:MPKEdit.State.NoteTable[i].region}]),
			elem(["td", {className:"pgs",innerHTML:MPKEdit.State.NoteTable[i].indexes.length}]),
			elem(["td", {className:"tool"}],
				elem(["span", {
					className: "fa fa-trash",draggable: true,
					onclick: MPKEdit.State.erase.bind(null, i)
				}]),
				elem(["span", {
					className: "fa fa-download",
					draggable: true,
					ondragstart: MPKEdit.State.saveNote.bind(null, i),
					onclick: MPKEdit.State.saveNote.bind(null, i)
				}])
			)
		);

		MPKEdit.jdenticon.update(tableRow.querySelector(".hash"), MPKEdit.State.NoteTable[i].xxhash64)
		return tableRow;
	};

	App.init = function() {
		function changeExportColor(event) {
			var target = document.querySelectorAll(".fa-download");
			for(var i = 0; i < target.length; i++) {
				target[i].style.color = event.ctrlKey ? "#c00" : "";
			}
		}

		function setDragFX() {
			function isFile(event) {
				var dt = event.dataTransfer;
				for (var i = 0; i < dt.types.length; i++) {
					if (dt.types[i] === "Files") {
						return true;
					}
				}
				return false;
			}

			var dropzone = document.getElementById("dropzone");
			var lastTarget = null;

			window.addEventListener("dragenter", function (event) {
				if (isFile(event)) {
					lastTarget = event.target;
					dropzone.style.visibility = "";
					dropzone.style.opacity = 1;
				}
			});

			window.addEventListener("dragleave", function (event) {
				event.preventDefault();
				if (event.target === lastTarget) {
					dropzone.style.visibility = "hidden";
					dropzone.style.opacity = 0;
				}
			});

			window.addEventListener("drop", function(event) {
				dropzone.style.visibility = "hidden";
				dropzone.style.opacity = 0;
				event.preventDefault();
			});
		}

		MPKEdit.State.init();

		window.addEventListener("dragover", function(event) {
			event.preventDefault();
		});
		window.addEventListener("drop", readFiles);
	
		document.getElementById("fileOpen").onchange = readFiles;
		document.getElementById("loadButton").onclick = browse;

		document.getElementById("save").addEventListener("dragstart", function(event) {
			var blobURL = URL.createObjectURL(new Blob([MPKEdit.State.data]));
			event.dataTransfer.setData("DownloadURL",
				"application/octet-stream:" + MPKEdit.State.filename + ":" + blobURL
			);
		});

		document.getElementById("save").onclick = MPKEdit.State.save;

		window.addEventListener("keydown", changeExportColor);
		window.addEventListener("keyup", changeExportColor);
		window.addEventListener("blur", changeExportColor);
		setDragFX();
	};

	App.updateUI = function() {
		var out = document.querySelector("table");
		while(out.firstChild) {
			out.removeChild(out.firstChild);
		}

		document.getElementById("filename").innerHTML = MPKEdit.State.filename;

		document.getElementById("stats").innerHTML = 

		"<span class=num>" + (123 - MPKEdit.State.usedPages) + "</span>/123 pages free · <span class=num>" + (16 - MPKEdit.State.usedNotes) + "</span>/16 notes free<br>"
		+ "<span style='height:4px;display:inline-block;border:1px solid;background:#EEE;width:120px'><span style='height:4px;display:block;background:red;width:"+((MPKEdit.State.usedPages / 123) * 100)+"%'></span></span>"
		+ "<span style='margin-left:10px;height:4px;display:inline-block;border:1px solid;background:#EEE;width:100px'><span style='height:4px;display:block;background:orange;width:"+((MPKEdit.State.usedNotes / 16) * 100)+"%'></span></span>";

		for(var i = 0; i < 16; i++) {
			if(MPKEdit.State.NoteTable[i]) {
				var tableRow = buildRow(i);
				out.appendChild(tableRow);
			}
		}

		if(Object.keys(MPKEdit.State.NoteTable).length === 0) {
			var empty =
			elem(["tr"],
				elem(["td"], elem(["div", {
					id: "emptyFile",
					innerHTML: "~ empty"
				}]))
			);
			out.appendChild(empty);
		}
	};

	MPKEdit.App = App;

	console.log("INFO: MPKEdit.App ready");
}());
