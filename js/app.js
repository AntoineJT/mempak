(function MPKApp() {
    var App = {};
    function pad(a,b,c){return (new Array(b||2).join(c||0)+a).slice(-(b||2))}

    /* -----------------------------------------------
    function: pixicon(t, r)
      generate random pixel icon from a seed
    */
    var pixicon = function(t, r) {
        function i(t, r, e, i=0) { // HSL color generator.
            var set = [
                [999*t%360, 24+80*r%40, 26+70*e%40],
                [999*t%360, 9*r%10, 15+36*e%50],
                [999*t%360, 14*r%40, 37+36*e%40]
            ];
            return "hsl("+ ~~set[i][0] +","+ ~~set[i][1] +"%,"+ ~~set[i][2] +"%)";
        }
        function LCG(seed) { // LCG pseudorandom number generator.
            function lcg(a) {return a * 48271 % 2147483647}
            seed = seed ? lcg(seed) : lcg(Math.random());
            return function() {return (seed = lcg(seed)) / 2147483648}
        }
        var n = 10, q = n*3, l = n*n, a = [], rng = LCG(r), c = t.getContext("2d");
        // Set canvas dimensions if not already set (performance boost).
        if(t.width !== q) {
            t.width = t.height = q,
            t.style.imageRendering = "-moz-crisp-edges",
            t.style.imageRendering = "pixelated";
        }
        c.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation.
        c.clearRect(0, 0, t.width, t.height); // Erase previous context.
        // Set fill color for pixels.
        var color1 = i(rng(), rng(), rng(), rng()>=.9 ? 1:0);
        var color2 = i(rng(), rng(), rng(), rng()>=.8 ? 2:0);
        c.fillStyle = color1;
        rng() > .5 && c.rotate(Math.PI * .5)|c.translate(0, -t.width); // Rotate canvas 90 degrees.
        // Generate pixel array
        var r = rng(), u = 0|(2*r*l+8*r+l)*.125;
        for(var s = 0; s < u; s++) a[s] = 1;
        // Shuffle pixel array (Fisher–Yates). NOTE: |0 prevents infinite loop.
        for(var v, s = 0|l/2; s;) v = 0|rng() * s--, [a[s], a[v]] = [a[v], a[s]];
        a = a.concat(a.slice().reverse()); // Append reversed pixel array.
        // Paint canvas.
        for(var o = t.width/n, d=y=s= 0; s < l; s++, d = s%n)
            // Change color at halfway point. NOTE: |0 required for odd sizes.
            (s === (0|l/2)) && (c.fillStyle = color2),
            (s && !d) && y++, // Increment y axis.
            (a[s]) && c.fillRect(o*d, o*y, o, o) // If pixel exists, fill square on canvas (x, y, w, h).
    };

    /* -----------------------------------------------
    function: buildRow(i)
      build HTMLElement row for NoteTable in MPK
    */
    var buildRow = function(i) {
        function fixHTML(str) { // sanitize comments for HTML.
            var rep = '&,amp,<,lt,>,gt,",quot,\',apos'.split(',');
            for(var i=0; i<rep.length; i+=2) str=str.replace(new RegExp(rep[i],'g'),`&${rep[i+1]};`);
            return str;
        }
        // Handle empty rows
        if(!State.NoteTable[i]) { 
            var tableRow = elem(["tr",{className:"empty"}],elem(["td",{innerHTML:i+1,"colSpan":16}]));
            return tableRow;
        }

        var cmtIcon = State.NoteTable[i].comment?"<span title='"+fixHTML(State.NoteTable[i].comment)+"' class='fa fa-comment'></span>":"";
        var displayName = State.NoteTable[i].noteName + cmtIcon;

        var tableRow =
        elem(["tr", {className: "note", id: i}],
            // start pixicon display
            App.cfg.identicon ?
            elem([],
                elem(["td",{className:"hash"}],elem(["canvas",{width:32,height:32,id:"hash"}])),
                elem(["td",{className:"divider"}],elem(["div"]))
            ) : "",
            // end pixicon display
            elem(["td",{className:"name",innerHTML:displayName}],
                elem(["div",App.codeDB[State.NoteTable[i].serial] || State.NoteTable[i].serial]) // lookup gameCode in codeDB
            ),
            elem(["td",{className:"divider"}],elem(["div"])),
            elem(["td",{className:"region",innerHTML:State.NoteTable[i].region}]),
            elem(["td",{className:"divider"}],elem(["div"])),
            elem(["td",{className:"pgs",innerHTML:State.NoteTable[i].indexes.length}]),
            elem(["td",{className:"divider"}],elem(["div"])),
            elem(["td",{className:"tool"}],
                elem(["span",{className:"fa fa-info-circle",onclick:App.buildModal}]),
                elem(["span",{className:"fa fa-trash",onclick:State.erase.bind(null,i)}]),
                elem(["span",{
                    className: "fa fa-download",
                    draggable: true,
                    ondragstart: State.saveNote.bind(null, i),
                    onclick: State.saveNote.bind(null, i)
                }])
            )
        );

        if(App.cfg.identicon) { // produce pixicons
            pixicon(tableRow.querySelector("#hash"), State.NoteTable[i].cyrb32);
        }
        return tableRow;
    };

    /* -----------------------------------------------
    function: buildModal(i)
      build a multi-purpose Modal popup window.
    */
    App.buildModal = function(e) {
        var modal = document.getElementById("modal");
        if(e.target.id==="modal") {
            modal.style.opacity = "0";
            modal.style.visibility = "hidden";
            return;}

        // wat
        else if(e.target.id==="menu"||e.target.className==="fa fa-info-circle") {

        while(modal.firstChild) {modal.removeChild(modal.firstChild);}
        var content = elem(["div",{className:"modalContent"}]);
        var col = ["#713257", "#D9C173", "#5B4DA4", "#3A991B", "#1B696A", "#69532F", "#A52626", "#92C9C0", "#1F4F75", "#D6664D", "#F4AD9B", "#BBF637", "#777564", "#497BA5", "#ED6BB2", "#3D4142"];

        // SETTINGS
        if(e.target.id === "menu") {
            var settings = elem([],
                elem(["h1", "Settings"]),

                elem(["div", {className: "modalBlock"}],
                    elem(["span", {className: "state"}],
                        elem(["input", {checked: App.cfg.hideRows, id: "hideRows", onchange: updateSettings, type:"checkbox"}]),
                        elem(["span", {onclick:function(){this.previousSibling.click()}, className: "chkb0x"}])
                    ),
                    elem(["div",{className: "text"}],
                    elem(["div", {className: "textLabel",onmousedown:function(e){e.preventDefault()}, innerHTML: "Hide empty rows",
                    onclick:function(){this.parentNode.previousSibling.querySelector("input").click()}}]),
                    elem(["div", {className: "textInfo", innerHTML: "Control whether empty rows are displayed."}])
                    )
                ),

                elem(["div", {className: "modalBlock"}],
                    elem(["span", {className: "state"}],
                        elem(["input", {checked: App.cfg.identicon, id: "identicon", onchange: updateSettings, type:"checkbox"}]),
                        elem(["span", {onclick:function(){this.previousSibling.click()}, className: "chkb0x"}])
                    ),
                    elem(["div",{className: "text"}],
                    elem(["div", {className: "textLabel",onmousedown:function(e){e.preventDefault()},
                        onclick:function(){this.parentNode.previousSibling.querySelector("input").click()}, innerHTML: "Show icons"}]),
                    elem(["div", {className: "textInfo", innerHTML: "Identify unique saves with icons."}])
                    )
                )
            );

        var x = elem(["div",{className:"pageContainer"}])
        for(var j = 0; j < 128; j++) {
            x.appendChild(elem(["span",{className:"b0x"}]))
            if((j+1)%32===0) {x.appendChild(elem(["br"]))}
        }

        var x2 = x.querySelectorAll("span.b0x")

        for(var i = 0; i < 16; i++) {
            if(State.NoteTable[i]) {
                var y = State.NoteTable[i].indexes;
                for(var j = 0; j < y.length; j++) {
                    var page = y[j];

                    x2[page].style.background = col[i]+"C0";
                    x2[page].style.borderColor = col[i]; 
                    console.log(x2[page]);
                }
            }
        }
            console.log(x);
            settings.appendChild(x)
            content.appendChild(settings)
        }

        if(e.target.className === "fa fa-info-circle") {
            var i = e.target.parentElement.parentElement.id;
            var i2 = (i*32)+0x300;
            var noteData = "<code>";
            for(var j = i2; j < i2+32; j++) {
                noteData += pad(State.data[j].toString(16).toUpperCase(),2);
                if((j-i2)===15) { noteData += "<br>"} else {noteData += " "}
                
            } noteData += "</code>"
            
            var noteInfo = elem([],
                elem(["h1","Note details"]),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Comment", className:"label"}]),
                    elem(["textarea", {maxLength: 2048, placeholder: "No comment...", oninput: function() {
                        var encoded = new TextEncoder("utf-8").encode(this.value);
                        if(encoded.length <= 4080) {
                            this.style.color = "";
                            State.NoteTable[i].comment = this.value;
                            App.updateUI();
                        } else {this.style.color = "red";}                        
                    }, className:"content", value: State.NoteTable[i].comment || ""}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Note name", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:State.NoteTable[i].noteName}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Game name", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.App.codeDB[State.NoteTable[i].serial]}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Game code", className:"label"}]),
                    elem(["span", {className:"content fixed", innerHTML:State.NoteTable[i].serial}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Region", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:State.NoteTable[i].region}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Publisher", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:MPKEdit.App.pubDB[State.NoteTable[i].publisher] + " (<code>"+State.NoteTable[i].publisher+"</code>)"}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Hash code", className:"label"}]),
                    elem(["span", {className:"content fixed", innerHTML:pad(State.NoteTable[i].cyrb32.toString(16),8)}])
                    ),
                elem(["div", {className:"modalFlex"}],
                    elem(["span", {innerHTML: "Used pages", className:"label"}]),
                    elem(["span", {className:"content", innerHTML:State.NoteTable[i].indexes.length + " ("+(State.NoteTable[i].indexes.length * 256)+" bytes)"}])
                    ),

                elem(["h1", "Raw note entry"]),
                elem(["div", {style:"text-align:center;font-size:14px;",innerHTML:noteData}])
            );
            content.appendChild(noteInfo);
                    var x = elem(["div",{className:"pageContainer"}])
        for(var j = 0; j < 128; j++) {
            x.appendChild(elem(["span",{className:"b0x",style:(State.NoteTable[i].indexes.indexOf(j)!==-1?" border-color:"+col[i]+";background:"+col[i]+"C0":"")}]))
            if((j+1)%32===0) {x.appendChild(elem(["br"]))}
        }
        content.appendChild(x);
        }

        modal.appendChild(content);



        modal.style.visibility = "";
        modal.style.opacity = "1";
        }
    };

    /* -----------------------------------------------
    function: updateSettings(i)
      Update a localStorage setting individually
    */
    var updateSettings = function() {
        App.cfg[this.id] = this.checked;
        if(MPKEdit.App.usefsys) chrome.storage.local.set({MPKEdit:App.cfg});
        else localStorage.MPKEdit = JSON.stringify(App.cfg);
        App.updateUI();
    };

    /* -----------------------------------------------
    function: App.updateUI()
      update the MPK data display UI. used when loading new files and
      when modifications occur.
    */
    App.updateUI = function() {
        document.getElementById("filename").innerHTML = State.filename;
        // Stats bar dynamic CSS
        var w1 = 100 * (State.usedPages / 123);
        var w2 = 100 * (State.usedNotes / 16);
        w1 = `width:${w1}%;`+(w1===100?"background:#547F96;":"")+(w1>0&&w1<100?"border-right:1px solid rgba(0,0,0,0.15)":"");
        w2 = `width:${w2}%;`+(w2===100?"background:#547F96;":"")+(w2>0&&w2<100?"border-right:1px solid rgba(0,0,0,0.15)":"");
        var status =
        `<span class=statBox>${123-State.usedPages}/123 pages free<div class=outerBar><div style='${w1}' class=innerBar></div></div></span>` +
        `<span class=statBox>${16 -State.usedNotes}/16  notes free<div class=outerBar><div style='${w2}' class=innerBar></div></div></span>`;
        document.getElementById("stats").innerHTML = status;
        
        var out = document.querySelector("table");
        // remove all elements in the table
        while(out.firstChild) out.removeChild(out.firstChild);

        for(var i = 0; i < 16; i++) {
            // skip if hideRows enabled & Note doesn't exist
            if(App.cfg.hideRows && !State.NoteTable[i]) {continue;}
            var tableRow = buildRow(i);
            out.appendChild(tableRow);
        }
        // display "Empty" msg if hideRows enabled
        if(out.innerHTML==="") out.innerHTML = "<tr><td class=empty>-Empty file-</td></tr>";
    };

    MPKEdit.App = App;
    var elem = MPKEdit.elem;
    var State = MPKEdit.State;

    console.log("INFO: MPKEdit.App ready");
}());
