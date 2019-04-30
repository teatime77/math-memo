declare var dagre:any;
declare var MathJax:any;
declare var firebase:any;

export default function graph_closure(){

    class Doc {
        id: number;
        title : string;
        blocks : TextBlock[];

        constructor(id: number, title: string, blocks: TextBlock[]){
            this.id = id;
            this.title = title;
            this.blocks = blocks;
        }
    }

    var block_text : HTMLTextAreaElement = document.getElementById("block-text") as HTMLTextAreaElement;
    var msg_text : HTMLSpanElement = document.getElementById("msg-text") as HTMLSpanElement;
    var doc_title_text: HTMLInputElement = document.getElementById("doc-title") as HTMLInputElement;
    var docs_select: HTMLSelectElement = document.getElementById("docs-select") as HTMLSelectElement;
    var menu_span = document.getElementById("menu-span") as HTMLSpanElement;

    var block_cnt = 0;
    var click_cnt = 0;   

    var cur_doc = new Doc(0, "", [] );
    var cur_block = null;
    var clicked = false; 
    var from_block : TextBlock | null = null;
    var dom_list : (HTMLElement | SVGSVGElement)[] = [];
    var timeout_id : number | null = null;

    var sys_inf: any = { "ver": 4 };

    doc_title_text.addEventListener("blur", function(){
        cur_doc.title = doc_title_text.value.trim();
    });

    document.body.addEventListener("click", function(){
        console.log("body clicked " + (click_cnt++));
    });

    block_text.addEventListener("keypress", function(){
        if((window.event as KeyboardEvent).code == "Enter" && (window.event as KeyboardEvent).ctrlKey == true){
    
            clear_dom();

            var lines = block_text.value.split("\n");
            block_text.value = "";
    
            var block = new TextBlock(cur_doc, "" + block_cnt, [], lines)
            block_cnt++;
    
            cur_doc.blocks.push(block);
            logic_graph.show_doc(cur_doc);
        }
    });

    docs_select.addEventListener("change", function(){

        var idx = docs_select.selectedIndex;
        if(idx == -1){
            return;
        }
        
        clear_dom();

        cur_doc = logic_graph.docs[idx];

        logic_graph.show_doc(cur_doc);
    });

    function show_menu(ev:MouseEvent, menu_defs: [string, any][]){
        
        var ul = document.createElement("ul");
        ul.className = "popup";
        for(let [label, fnc] of menu_defs){
            var li = document.createElement("li");
            
            var btn = document.createElement("button");
            btn.innerHTML = label;
            btn.addEventListener("click", fnc);

            li.appendChild(btn);
            ul.appendChild(li);

        }
        var dlg = document.createElement("dialog") as HTMLDialogElement;
        dlg.style.position = "absolute";
        dlg.style.left = ev.x + "px";
        dlg.style.top  = ev.y + "px";
        dlg.addEventListener("click", ()=>dlg.close());


        dlg.appendChild(ul);
        document.body.appendChild(dlg);
        dlg.showModal();
    }

    menu_span.addEventListener("contextmenu", function(ev){
        ev.preventDefault();
        console.log(ev);

        show_menu(ev, [
            ["ファイル", ()=>{ console.log("ファイル"); }],
            ["編集", ()=>{ console.log("編集"); }],
            ["表示", ()=>{ console.log("表示"); }],
        ]);
    });


    function msg(txt : string){
        if(timeout_id != null){
            clearTimeout(timeout_id);
        }

        msg_text.innerHTML = txt;

        timeout_id = setTimeout(function(txt1){
            return function(){
                msg_text.innerHTML = "";
                timeout_id = null;
            }
        }(txt), 3000);
    }

    function clear_dom(){
        for(let dom of dom_list){
            dom.parentNode!.removeChild(dom);
        }
        dom_list = [];
    }

    function restore_doc(doc_obj:any) : Doc {
        var doc = new Doc(parseInt(doc_obj.id, 10), doc_obj.title, []);

        var block_objs = JSON.parse(doc_obj.blocks_str);
        doc.blocks = block_objs.map((blc:any) => new TextBlock(doc, blc.id, blc.from, blc.lines));

        return doc;
    }

    function stringify_doc(doc: Doc){
        var block_objs = doc.blocks.map(blc => ({ "id": blc.id, "from": blc.from, "lines": blc.lines}));
        
        var blocks_str = JSON.stringify(block_objs);

        if(doc.title == undefined){

            return { "id": doc.id, "blocks_str": blocks_str };
        }
        else{

            return { "id": doc.id, "title": doc.title, "blocks_str": blocks_str };
        }
    }
    
    function get_indent(line: string) : [number, string]{
        var indent = 0;
        while(true){
            if(line.startsWith("\t")){
                indent++;
                line = line.substring(1);    
            }
            else if(line.startsWith("    ")){
                indent++;
                line = line.substring(4);
            }
            else{
                return [indent, line];
            }
        }
    }

    function tab(indent: number){
        return " ".repeat(4 * indent);
    }

    class OrderedMap<K, V> {
        map: any;
        keys: K[];
        constructor(){
            this.map = new Map();
            this.keys = [];
        }
    
        set(key: K, value: V){
            if(! this.map.has(key)){
                this.keys.push(key);
            }
            this.map.set(key, value);
        }
    
        get(key: K) : V {
            return this.map.get(key);
        }
    
        has(key: K) : boolean {
            return this.map.has(key);
        }
    
        values() : V[] {
            return this.keys.map(x => this.map.get(x) as V);
        }
    }    
    
    var padding = 10;
    
    function add_node_rect(svg1: SVGSVGElement, nd: any){
        var rc = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rc.setAttribute("x", "" + (nd.x - nd.width/2));
        rc.setAttribute("y", "" + (nd.y - nd.height/2));
        rc.setAttribute("width", nd.width);
        rc.setAttribute("height", nd.height);
        rc.setAttribute("fill", "cornsilk");
        rc.setAttribute("stroke", "green");
        svg1.appendChild(rc);
    }
    
    function add_edge(svg1: SVGSVGElement, block1: TextBlock, block2: TextBlock, ed: any){
        var path = document.createElementNS("http://www.w3.org/2000/svg","path");
    
        var d: string = ""; 
    
        if(ed.points.length == 2){

            for(let [i, pnt] of ed.points.entries()){
                if(i == 0){
        
                    d = `M ${pnt.x},${pnt.y}`;
                }
                else{
        
                    d += ` L${pnt.x},${pnt.y}`;
                }
            }
        }
        else{

            for(let [i, pnt] of ed.points.entries()){
                if(i == 0){
        
                    d = `M ${pnt.x},${pnt.y} Q`;
                }
                else{
        
                    d += ` ${pnt.x},${pnt.y}`;
                }
            }
        }
        path.setAttribute("fill", "transparent");
        path.setAttribute("stroke", "red");
        path.setAttribute("stroke-width", "3px");
        path.setAttribute("d", d);

        path.addEventListener("click", (function(temp) {

            return function(){                
                if (clicked) {
                    clicked = false;

                    console.log("double click!! " + (click_cnt++) + " " + temp);
                    var blc1 = temp[0];
                    var blc2 = temp[1];

                    var k = blc2.from.indexOf(blc1.id);
                    console.assert(k != -1);
                    blc2.from.splice(k, 1);

                    // block_text.value = temp.lines.join("\n");
            
                    clear_dom();
                    logic_graph.show_doc(cur_doc);

                    return;
                }
            
                clicked = true;
                setTimeout(function () {
                    if (clicked) {
                        console.log("single click! " + (click_cnt++));
                    }
            
                    clicked = false;
                }, 300);
           }
        }([block1, block2])));

        svg1.appendChild(path);
    }    

    function get_size(ele: HTMLDivElement){
        var spans = ele.getElementsByTagName("span");

        var min_x = Number.MAX_VALUE, min_y = Number.MAX_VALUE;
        var max_x = 0, max_y = 0;
        for(let span of spans){
            if(span.className == "MathJax_Preview" || span.className == "MJX_Assistive_MathML MJX_Assistive_MathML_Block"){
                continue;
            }
            var rc = span.getBoundingClientRect();
            // console.log(`${span.className} rc:${rc.x},${rc.y},${rc.width},${rc.height}, ${span.innerText.replace('\n', ' ')}`);
            if(span.className == "MathJax_SVG"){

                max_x = Math.max(max_x, rc.width);
            }
            else{

                min_x = Math.min(min_x, rc.left);
                max_x = Math.max(max_x, rc.right);
            }
            min_y = Math.min(min_y, rc.top);
            max_y = Math.max(max_y, rc.bottom);
        }
        if(min_x == Number.MAX_VALUE){
            min_x = 0;
        }

        return [max_x - min_x, max_y - min_y]
    }
    
    function ontypeset(id_blocks: OrderedMap<string, TextBlock>, svg1: SVGSVGElement){
        // Create a new directed graph 
        var g = new dagre.graphlib.Graph();
    
        // Set an object for the graph label
        g.setGraph({});
    
        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() { return {}; });
    
        for(let blc of id_blocks.values()){
            var width, height;
            [width, height] = get_size(blc.ele!);
            blc.ele!.style.width  = (width + 2 * padding) + "px";
            blc.ele!.style.height = (height + 2 * padding) + "px";

            g.setNode(blc.id,    { width: width + 2 * padding, height: height + 2 * padding });   // label: ele.id,  

            for(let id of blc.from){

                g.setEdge(id, blc.id);
            }
        }
    
        dagre.layout(g);
        
        var max_x = 0, max_y = 0;
        g.nodes().forEach(function(id:string) {
            var nd = g.node(id);
            max_x = Math.max(max_x, nd.x + nd.width / 2);
            max_y = Math.max(max_y, nd.y + nd.height/ 2);
        });
    
        svg1.style.width  = max_x + "px";
        svg1.style.height = max_y + "px";
    
    
        var rc1 = svg1.getBoundingClientRect() as DOMRect;
        g.nodes().forEach(function(id:string) {
            var nd = g.node(id);
    
            var block = id_blocks.get(id);
            var ele = block.ele!;
        
            ele.style.position = "absolute";
            ele.style.left = `${window.scrollX + rc1.x + nd.x - nd.width /2 + padding}px`
            ele.style.top  = `${window.scrollY + rc1.y + nd.y - nd.height/2 + padding}px`

            ele.addEventListener("click", (function(temp) {

                return function(){
                    var ev = window.event as KeyboardEvent;

                    ev.stopPropagation();

                    if(ev.ctrlKey){

                        if(from_block == null){

                            msg("接続先のブロックをクリックしてください。");
                            from_block = temp;
                        }
                        else{

                            if(temp.from.includes(from_block.id)){

                                msg("接続済みです。");
                            }
                            else{

                                msg("ブロックを接続しました。" + from_block.id + "->" + temp.id);
                                temp.from.push(from_block.id);
                            }
                            from_block = null;

                            clear_dom();
                            logic_graph.show_doc(cur_doc);
                        }
                    }
                    else{

                        console.log("click block " + (click_cnt++));
                        cur_block = temp;
                        block_text.value = temp.lines.join("\n");
                    }
               }
            }(block)));
                
            add_node_rect(svg1, nd);
        });
    
    
        g.edges().forEach(function(edge_id:any) {
            var blc1 = id_blocks.get(edge_id["v"]);
            var blc2 = id_blocks.get(edge_id["w"]);

            var ed = g.edge(edge_id);
            add_edge(svg1, blc1, blc2, ed);
        });         

        logic_graph.pending = false;
    }
    
    class TextBlock {
        parent: any;
        id: string;
        from: string[];
        lines: string[];
        ele: HTMLDivElement | null;
        
        constructor(parent: Doc, id: string, from: string[], lines: string[]){
            this.parent = parent;
            this.id = id;
            this.from = from;
            this.lines = lines;
            this.ele = null;
        }


        make_html_lines(){
            var html_lines = [];            

            var in_math = false;
            var ul_indent = -1;
            var prev_line = "";
            for(let current_line of this.lines){
                var current_line_trim = current_line.trim();

                let [indent, line] = get_indent(current_line);
                indent--;

                if(current_line_trim == "$$"){
                    in_math = ! in_math;
                    html_lines.push(current_line);
                }
                else{
                    if(in_math){

                        html_lines.push(current_line);
                    }
                    else{

                        if(line.startsWith("# ")){
                            html_lines.push(tab(indent + 1) + "<strong><span>" + line.substring(2) + "</span></strong><br/>")
                        }
                        else if(line.startsWith("- ")){
                            if(ul_indent < indent){
                                console.assert(ul_indent + 1 == indent);
                                html_lines.push(tab(indent) + "<ul>")
                                ul_indent++;
                            }
                            else{
                                while(ul_indent > indent){
                                    html_lines.push(tab(ul_indent) + "</ul>")
                                    ul_indent--;
                                }                            
                            }
                            html_lines.push(tab(indent + 1) + "<li><span>" + line.substring(2) + "</span></li>")
                        }
                        else{

                            if(prev_line.endsWith("</li>")){
                                html_lines[html_lines.length - 1] = prev_line.substring(0, prev_line.length - 5) + "<br/>";
                                html_lines.push(tab(indent + 1) + "<span>" + line + "</span></li>")
                            }
                            else{

                                html_lines.push(tab(indent + 1) + "<span>" + line + "</span><br/>")
                            }
                        }
                    }
                }

                prev_line = html_lines[html_lines.length - 1];
            }

            while(ul_indent != -1){
                html_lines.push(tab(ul_indent) + "</ul>")
                ul_indent--;
            }

            return html_lines;
        }

        /*
            HTML要素を作る。
        */
        make(){
            var html_lines = this.make_html_lines();

            this.ele = document.createElement("div");
            this.ele.innerHTML = html_lines.join("\n");
            this.ele.id = this.id;
            document.body.appendChild(this.ele);
            
            var br = document.createElement("br");
            document.body.appendChild(br);

            dom_list.push(this.ele);
            dom_list.push(br);
        }
    }

    class LogicGraph{
        pending: boolean;
        docs: Doc[];
        user: any;

        constructor(){
            this.pending = false;
            this.docs = [];
            this.user = null;
        }

        new_doc(){
            clear_dom();

            var max_id = Math.max(... this.docs.map(x => x.id));
            cur_doc = new Doc(max_id + 1, "タイトル", []);

            var blc = new TextBlock(cur_doc, "#0", [], ["テキスト"]);

            cur_doc.blocks.push(blc)

            var opt = document.createElement("option");
            opt.text = cur_doc.title;
            docs_select.appendChild(opt);
    
            logic_graph.show_doc(cur_doc);    
        }

        show_doc(doc: Doc){
            doc_title_text.value = cur_doc.title;

            var svg1 = document.createElementNS("http://www.w3.org/2000/svg","svg");
            svg1.style.backgroundColor = "wheat";
            svg1.addEventListener("click", function(){
                console.log("SVG clicked " + (click_cnt++));
            })
            document.body.appendChild(svg1);

            var id_blocks = new OrderedMap();

            for(let block of doc.blocks){

                id_blocks.set(block.id, block);

                block.make();
            }

            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
            MathJax.Hub.Queue([ontypeset, id_blocks, svg1]);

            var hr = document.createElement("hr");
            document.body.appendChild(hr);

            dom_list.push(svg1);
            dom_list.push(hr);
        }

        read_docs(){
            while (docs_select.options.length > 0) {                
                docs_select.remove(0);
            }

            this.docs = [];
            db.collection('users-' + sys_inf.ver ).doc(this.user.uid).collection('docs')
            .get().then((querySnapshot: any) => {
                querySnapshot.forEach((data:any) => {
                    var doc = restore_doc(data.data());

                    this.docs.push(doc);                    
                });

                this.docs.sort((a,b) => a.id - b.id );
                for(let doc of this.docs){
                    var opt = document.createElement("option");
                    if(doc.title == undefined){

                        opt.text = "???";
                    }
                    else{

                        opt.text = doc.title;
                    }
                    docs_select.appendChild(opt);
                }
                console.log("rcv doc 終わり", this.docs);
            });            
        }

        save_docs(){

            if(this.user == null){
                msg("ログインしていません。");
            }

            for(let doc of this.docs){
                var doc_ref = db.collection('users-' + (sys_inf.ver + 1)).doc(this.user.uid).collection('docs').doc("" + doc.id);

                var doc_str = stringify_doc(doc);
                doc_ref.set(doc_str)
                .then(function() {
                    console.log("Document written");
                })
                .catch(function(error: any) {
                    console.error("Error adding document: ", error);
                });
            }

            var sys_ref = db.collection('sys').doc("0");
            var ver = (sys_inf.ver + 1) % 10;
            sys_ref.set({ "ver": ver })
            .then(function() {
                console.log("SYS inf written: " + ver);
            })
            .catch(function(error: any) {
                console.error("Error adding SYS inf: ", error);
            });
        }
    }

    var db = firebase.firestore();


    db.collection('sys').doc("0").get()
    .then(function(obj:any) {
        if (obj.exists) {
            sys_inf = obj.data();
            console.log("SYS inf:" + sys_inf.ver);
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    })
    .catch(function(error:any) {
        console.log("Error getting sys-inf:", error);
    });    

    firebase.auth().onAuthStateChanged(function(user: any) {
        if (user) {
            // User is signed in.
            console.log(`ログイン ${user.uid}`);

            logic_graph.user = user;

            var user1 = firebase.auth().currentUser;

            if (user1) {
                // User is signed in.
                console.log(user1);
            } 
            else {
                // No user is signed in.
                console.log("ログアウト");
            }

        } else {
            // User is signed out.
            // ...
            console.log("ログアウト");
        }
    });
    
    var logic_graph : LogicGraph = new LogicGraph();

    return logic_graph;
}
