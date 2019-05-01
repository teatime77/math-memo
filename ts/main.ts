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

export var click_cnt = 0;   

export var cur_doc = new Doc(0, "", [] );
export var cur_block : TextBlock | null = null;
export var cur_edge  : Edge | null = null;
var timeout_id : number | null = null;

var sys_inf: any = { "ver": 4 };

doc_title_text.addEventListener("blur", function(){
    cur_doc.title = doc_title_text.value.trim();

    console.assert(docs_select.selectedIndex != -1);
    console.assert(logic_graph.docs[docs_select.selectedIndex] === cur_doc);

    var opt = docs_select.selectedOptions[0];
    opt.text = cur_doc.title;
});

document.body.addEventListener("click", function(){
    console.log("body clicked " + (click_cnt++));
});

block_text.addEventListener("keypress", function(){
    if((window.event as KeyboardEvent).code == "Enter" && (window.event as KeyboardEvent).ctrlKey == true){

        new TextBlock(cur_doc, [], block_text.value, null);

        block_text.value = "";

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

function make_span(text: string){
    var span = document.createElement("span");
    span.innerHTML = text;
    return span;        
}

function make_button(label: string, fnc: any){
    var btn = document.createElement("button");
    btn.innerHTML = label;
    btn.addEventListener("click", fnc);

    return btn;
}

function make_sub_menu(parent: HTMLElement, label:string, sub_menu: any[]){
    parent.appendChild( make_span(label) );

    var ul = document.createElement("ul");
    ul.className = "popup";
    for(let [label, fnc] of sub_menu){
        var li = document.createElement("li");
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

function show_menu(ev:MouseEvent, label:string, menu_defs: [string, any][]){
    var dlg = document.createElement("dialog") as HTMLDialogElement;
    dlg.style.position = "absolute";
    dlg.style.left = ev.x + "px";
    dlg.style.top  = ev.y + "px";
    dlg.addEventListener("click", ()=>dlg.close());

    make_sub_menu(dlg, label, menu_defs);

    document.body.appendChild(dlg);
    dlg.showModal();
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

    show_menu(ev, "メニュー", [
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

    constructor(src_id: string, dst_id: string, label: string){
        this.src_id = src_id;
        this.dst_id = dst_id;
        this.label = label;
    }

    to_json(){
        return { "src_id": this.src_id, "dst_id": this.dst_id, "label": this.label };
    }
}

export class TextBlock {
    parent: any;
    id: string;
    inputs: Edge[];
    text: string;
    link : number | null;
    ele: HTMLDivElement | null;
    
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


    /*
        HTML要素を作る。
    */
    make(){
        this.ele = document.createElement("div");
        this.ele.innerHTML = make_html_lines(this.text);
        document.body.appendChild(this.ele);
        
        dom_list.push(this.ele);
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
