/// <reference path="graph.ts" />
namespace MathMemo {

declare var firebase:any;

export var block_text : HTMLTextAreaElement = document.getElementById("block-text") as HTMLTextAreaElement;

export class Doc {
    id: number;
    title : string;
    blocks : TextBlock[];

    constructor(id: number, title: string, blocks: TextBlock[]){
        this.id = id;
        this.title = title;
        this.blocks = blocks;
    }
}

var msg_text : HTMLSpanElement = document.getElementById("msg-text") as HTMLSpanElement;
export var doc_title_text: HTMLInputElement = document.getElementById("doc-title") as HTMLInputElement;
export var edge_label_input = document.getElementById("edge-label") as HTMLInputElement;
var docs_select: HTMLSelectElement = document.getElementById("docs-select") as HTMLSelectElement;
var menu_span = document.getElementById("menu-span") as HTMLSpanElement;
var popup_menu = document.getElementById("popup-menu") as HTMLDivElement;

export var click_cnt = 0;   

export var cur_doc = new Doc(0, "", [] );
export var cur_block : TextBlock | null = null;
export var cur_edge  : Edge | null = null;
var timeout_id : number | null = null;
var from_block : TextBlock | null = null;

var sys_inf: any = { "ver": 4 };

doc_title_text.addEventListener("blur", function(){
    cur_doc.title = doc_title_text.value.trim();

    console.assert(docs_select.selectedIndex != -1);
    console.assert(logic_graph.docs[docs_select.selectedIndex] === cur_doc);

    var opt = docs_select.selectedOptions[0];
    opt.text = cur_doc.title;
});

document.body.addEventListener("click", function(){
    console.log("body clicked " + cur_doc.blocks.length);
    if(popup_menu.style.display != "none"){

        popup_menu.style.display = "none";
    }
});

document.body.addEventListener("blur", function(){
    console.log("body blur ");
});

document.body.addEventListener("keypress", function(){
    console.log("body keypress ");
});

document.body.addEventListener("change", function(){
    console.log("body change ");
});

function make_html_map(){
    var map = new Map();

    for(let block of cur_doc.blocks){
        if(block.ele != null){

            map.set(block.ele, block);
        }
        for(let edge of block.inputs){
            if(edge.rect != null){

                map.set(edge.rect, edge);
            }
            for(let path of edge.paths){
                map.set(path, edge);
            }
        }
    }

    return map;
}

document.body.addEventListener("contextmenu", function(){
    var ev = window.event as MouseEvent;
    var src = ev.srcElement as any;
    var map = make_html_map();

    for(var ele =  src; ele != document.body; ele = ele!.parentNode){
        if(map.has(ele)){

            var obj = map.get(ele);
            console.log(`body menu ${src} ${obj.constructor.name} pos:${ev.x} ${ev.y} `);

            if(obj.constructor.name == "TextBlock"){

                ev.preventDefault();
                show_menu(ev, [
                    ["削除", (obj as TextBlock).del_block ]
                ]);
            }
        
            return;
        }
    }
    console.log("body contextmenu " + src);
});

block_text.addEventListener("keypress", function(){
    if((window.event as KeyboardEvent).code == "Enter" && (window.event as KeyboardEvent).ctrlKey == true){

        new TextBlock(cur_doc, [], block_text.value, null);

        set_cur_block(null);

        show_doc(cur_doc);
    }
});

block_text.addEventListener("blur", function(){
    if(cur_block != null){
        if(cur_block.text != block_text.value){
            // ブロックのテキストが変わった場合

            cur_block.text = block_text.value;

            show_doc(cur_doc);
        }

        cur_block = null;
        block_text.value = "";
    }
});

edge_label_input.addEventListener("blur", function(){
    if(cur_edge == null){
        return;
    }
    cur_edge.label = edge_label_input.value.trim();
    cur_edge = null;

    show_doc(cur_doc);
});

docs_select.addEventListener("change", function(){

    var idx = docs_select.selectedIndex;
    if(idx == -1){
        return;
    }
    
    cur_doc = logic_graph.docs[idx];

    show_doc(cur_doc);
});

function array_remove<T>(arr:T[], value:T){
    var i = arr.indexOf(value);
    if(i == -1){
        return false;
    }
    else{

        arr.splice(i, 1);
        return true;
    }
}

export function get_block(id: string){
    return cur_doc.blocks.find(x => x.id == id);
}


function set_cur_edge(edge: Edge|null){
    if(cur_edge != null){
        if(cur_edge.rect != null){

            cur_edge.rect!.setAttribute("stroke", "navy");
        }
        for(let path of cur_edge.paths){
            path.setAttribute("stroke", "navy");
        }

        edge_label_input.value = "";
    }

    cur_edge = edge;

    if(cur_edge != null){
        if(cur_edge.rect != null){

            cur_edge.rect!.setAttribute("stroke", "red");
        }
        for(let path of cur_edge.paths){
            path.setAttribute("stroke", "red");
        }

        edge_label_input.value = cur_edge.label;
    }
}

function set_cur_block(block: TextBlock|null){
    if(cur_block != null){
        if(cur_block.rect != null){

            if(cur_block.link == null){

                cur_block.rect!.setAttribute("stroke", "green");
            }
            else{
        
                cur_block.rect!.setAttribute("stroke", "blue");
            }
        }

        block_text.value = "";
    }

    cur_block = block;

    if(cur_block != null){
        if(cur_block.rect != null){

            cur_block.rect!.setAttribute("stroke", "red");
        }

        block_text.value = cur_block.text;
    }
}

function make_span(text: string){
    var span = document.createElement("span");
    span.innerHTML = text;
    return span;        
}

function make_div(text: string){
    var ele = document.createElement("div");
    ele.innerHTML = make_html_lines(text);
    document.body.appendChild(ele);
    
    dom_list.push(ele);

    return ele;
}

function make_button(label: string, fnc: any){
    var btn = document.createElement("button");
    btn.innerHTML = label;
    btn.addEventListener("click", fnc);

    return btn;
}

function make_sub_menu(parent: HTMLElement, label:string|null, sub_menu: any[]){
    if(label != null){

        var span = make_span(label);
        span.className = "popup_label";
        parent.appendChild( span );
    }

    var ul = document.createElement("ul");
    ul.className = "popup_ul";
    for(let [label, fnc] of sub_menu){
        var li = document.createElement("li");
        li.className = "popup_li";
        if(Array.isArray(fnc)){

            make_sub_menu(li, label, fnc);
        }
        else{

            li.appendChild( make_button(label, fnc) );
        }
        
        ul.appendChild(li);
    }
    parent.appendChild( ul );
}

function show_menu(ev:MouseEvent, menu_defs: [string, any][]){
    popup_menu.innerHTML = "";
    make_sub_menu(popup_menu, null, menu_defs);

    popup_menu.style.left = ev.x + "px";
    popup_menu.style.top  = ev.y + "px";
    popup_menu.style.display = "inline-block";
}

menu_span.addEventListener("contextmenu", function(ev){
    ev.preventDefault();
    console.log(ev);

    var docs_menu : [string, any][] = [];

    for(let doc of logic_graph.docs){

        var fnc = function (x) {
            return function() {
                console.log(x.title);
                new TextBlock(cur_doc, [], x.title, doc.id);
                show_doc(cur_doc);
            };
        }(doc);

        docs_menu.push([ doc.title, fnc ]);
    }

    show_menu(ev, [
        [ "コピー", docs_menu ], 
        ["ファイル", ()=>{ console.log("ファイル"); }],
        ["編集", ()=>{ console.log("編集"); }],
        ["表示", ()=>{ console.log("表示"); }],
    ]);
});


export function msg(txt : string){
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

function restore_doc(doc_obj:any) : Doc {
    var doc = new Doc(parseInt(doc_obj.id, 10), doc_obj.title, []);

    var block_objs = JSON.parse(doc_obj.blocks_str);

    for(let [i, blc] of block_objs.entries()){
        console.assert("#" + i == blc.id);

        var inputs = blc.inputs.map((x:any) => new Edge(x.src_id, x.dst_id, x.label));
        new TextBlock(doc, inputs, blc.text, (blc.link == undefined ? null : blc.link));
    }

    return doc;
}

function stringify_doc(doc: Doc){
    var block_objs = doc.blocks.map(blc => blc.to_json());
    
    var blocks_str = JSON.stringify(block_objs);

    if(doc.title == undefined){

        return { "id": doc.id, "blocks_str": blocks_str };
    }
    else{

        return { "id": doc.id, "title": doc.title, "blocks_str": blocks_str };
    }
}

export class OrderedMap<K, V> {
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

export class Edge {
    src_id: string;
    dst_id: string;
    label: string;
    label_ele: HTMLDivElement | null;
    clicked = false; 
    rect: SVGRectElement|null = null;
    paths: SVGPathElement[] = [];

    constructor(src_id: string, dst_id: string, label: string){
        this.src_id = src_id;
        this.dst_id = dst_id;
        this.label = label;
        this.label_ele = null;
    }

    to_json(){
        return { "src_id": this.src_id, "dst_id": this.dst_id, "label": this.label };
    }

    onclick_edge=()=>{
        (window.event as MouseEvent).stopPropagation();

        if (this.clicked) {
            this.clicked = false;

            console.log("double click!! " + (click_cnt++));

            var dst_blc = get_block(this.dst_id)!;
            var removed = array_remove(dst_blc.inputs, this);
            console.assert(removed);
    
            show_doc(cur_doc);

            return;
        }
    
        this.clicked = true;
        setTimeout(()=>{
            if (this.clicked) {
                console.log("single click! " + (click_cnt++));

                set_cur_edge(this);
            }
    
            this.clicked = false;
        }, 300);
    }

    onclick_edge_label=()=>{
        set_cur_edge(this);
    }
}

export class TextBlock {
    parent: any;
    id: string;
    inputs: Edge[];
    text: string;
    link : number | null;
    ele: HTMLDivElement | null;
    rect: SVGRectElement|null = null;
    
    constructor(parent: Doc, inputs: Edge[], text: string, link: number | null){
        this.parent = parent;
        this.id = "#" + parent.blocks.length;
        this.inputs = inputs;
        this.text = text;
        this.link = link;
        this.ele = null;

        parent.blocks.push(this);
    }

    to_json(){
        return { "id": this.id, "inputs": this.inputs.map(x => x.to_json()), "text": this.text, "link": this.link}
    }

    input_src_ids(){
        return this.inputs.map(x => x.src_id);
    }


    del_block = ()=>{
        for(let blc of cur_doc.blocks){
            blc.inputs = blc.inputs.filter(x => x.src_id != this.id);
        }
    
        array_remove(cur_doc.blocks, this);
    
        show_doc(cur_doc);
    }
    

    onclick_block=()=>{
        var ev = window.event as KeyboardEvent;

        ev.stopPropagation();

        if(ev.ctrlKey){

            if(from_block == null){

                msg("接続先のブロックをクリックしてください。");
                from_block = this;
            }
            else{

                if(this.input_src_ids().includes(from_block.id)){

                    msg("接続済みです。");
                }
                else{

                    msg("ブロックを接続しました。" + from_block.id + "->" + this.id);
                    this.inputs.push(new Edge(from_block.id, this.id, ""));
                }
                from_block = null;

                show_doc(cur_doc);
            }
        }
        else{

            console.log("click block " + (click_cnt++));
            set_cur_block(this);

            set_cur_edge(null);
        }
    }        

    /*
        HTML要素を作る。
    */
    make(){
        this.ele = make_div(this.text);
        this.ele.addEventListener("click", this.onclick_block);

        for(let edge of this.inputs){
            if(edge.label != ""){
                edge.label_ele = make_div(edge.label);
                edge.label_ele.addEventListener("click", edge.onclick_edge_label);
            }
        }
    }
}

export class LogicGraph{
    pending: boolean;
    docs: Doc[];
    user: any;

    constructor(){
        this.pending = false;
        this.docs = [];
        this.user = null;
    }

    new_doc=()=>{
        var max_id = Math.max(... this.docs.map(x => x.id));
        cur_doc = new Doc(max_id + 1, "タイトル", []);

        new TextBlock(cur_doc, [], "テキスト", null);

        this.docs.push(cur_doc);

        var opt = document.createElement("option");
        opt.text = cur_doc.title;
        docs_select.appendChild(opt);
        docs_select.selectedIndex = docs_select.options.length - 1;

        show_doc(cur_doc);    
    }

    read_docs = ()=>{
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

    save_docs=()=>{

        if(this.user == null){
            msg("ログインしていません。");
        }

        var next_ver = (sys_inf.ver + 1) % 10;
        for(let doc of this.docs){
            var doc_ref = db.collection('users-' + next_ver).doc(this.user.uid).collection('docs').doc("" + doc.id);

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
        sys_ref.set({ "ver": next_ver })
        .then(function() {
            console.log("SYS inf written: " + next_ver);
        })
        .catch(function(error: any) {
            console.error("Error adding SYS inf: ", error);
        });
    }
}

var db = firebase.firestore();

export var logic_graph : LogicGraph;

export function init_graph(){
    logic_graph = new LogicGraph();

    document.getElementById("new-doc-btn")!.addEventListener("click", logic_graph.new_doc);
    document.getElementById("read-doc-btn")!.addEventListener("click", logic_graph.read_docs);
    document.getElementById("save-doc-btn")!.addEventListener("click", logic_graph.save_docs);

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

}
}
