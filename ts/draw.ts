/// <reference path="util.ts" />
namespace MathMemo{

declare var MathJax:any;
var capture: Point|null = null

var svg : SVGSVGElement;
var G0 : SVGGElement;
var G1 : SVGGElement;
var G2 : SVGGElement;

var CTM : DOMMatrix;
var CTMInv : DOMMatrix;
var svg_ratio: number;

var angle_dlg : HTMLDialogElement;
var angle_dlg_ok : HTMLInputElement;
var angle_dlg_color : HTMLInputElement;

var tool_type = "line-segment";

var shapes: Shape[] = [];
var selected_shapes: Shape[] = [];

var tool : Tool | null = null;

class Vec2 {
    x: number;
    y: number;

    constructor(x:number, y: number){
        this.x = x;
        this.y = y;
    }

    equals(pt: Vec2): boolean {
        return this.x == pt.x && this.y == pt.y;
    }

    add(pt: Vec2) : Vec2{
        return new Vec2(this.x + pt.x, this.y + pt.y);
    }

    sub(pt: Vec2) : Vec2{
        return new Vec2(this.x - pt.x, this.y - pt.y);
    }

    mul(c: number) : Vec2 {
        return new Vec2(c * this.x, c * this.y);
    }

    len(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    dist(pt:Vec2) : number {
        var dx = pt.x - this.x;
        var dy = pt.y - this.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    dot(pt:Vec2) : number{
        return this.x * pt.x + this.y * pt.y;
    }

    unit() : Vec2{
        var d = this.len();

        if(d == 0){

            return new Vec2(0, 0);
        }

        return new Vec2(this.x / d, this.y / d);
    }
}

class Mat2 {
    a11 : number;
    a12 : number;
    a21 : number;
    a22 : number;

    constructor(a11:number, a12:number, a21:number, a22:number){
        this.a11 = a11;
        this.a12 = a12;
        this.a21 = a21;
        this.a22 = a22;
    }

    print(){
        console.log(`${this.a11} ${this.a12}\n${this.a21} ${this.a22}`);
    }

    det(){
        return this.a11 * this.a22 - this.a12 * this.a21;
    }

    mul(m:Mat2):Mat2 {
        return new Mat2(this.a11 * m.a11 + this.a12 * m.a21, this.a11 * m.a12 + this.a12 * m.a22, this.a21 * m.a11 + this.a22 * m.a21, this.a21 * m.a12 + this.a22 * m.a22);
    }

    dot(v:Vec2) : Vec2{
        return new Vec2(this.a11 * v.x + this.a12 * v.y, this.a21 * v.x + this.a22 * v.y);
    }

    inv() : Mat2 {
        var det = this.det();
        console.assert(det != 0);

        return new Mat2(this.a22 / det, - this.a12 / det, - this.a21 / det, this.a11 / det)
    }
}

function OrderPoints(p1:Vec2, p2:Vec2){
    var pt1 = new Vec2(p1.x, p1.y);
    var pt2 = new Vec2(p2.x, p2.y);

    if(pt2.x < pt1.x){
        var tmp = pt1.x;
        pt1.x = pt2.x;
        pt2.x = tmp;
    }

    if(pt2.y < pt1.y){
        var tmp = pt1.y;
        pt1.y = pt2.y;
        pt2.y = tmp;
    }

    return [pt1, pt2];
}

function to_svg(x:number) : number{
    return x * svg_ratio;
}

function get_svg_point(ev: MouseEvent | PointerEvent){
	var point = svg.createSVGPoint();
	
    //画面上の座標を取得する．
    point.x = ev.offsetX;
    point.y = ev.offsetY;

    //座標に逆行列を適用する．
    var p = point.matrixTransform(CTMInv);    

    p.y = - p.y;
    return new Vec2(p.x, p.y);
}

function click_handle(ev: MouseEvent, pt:Vec2) : Point{
    var handle = get_point(ev);
    if(handle == null){

        var line = get_line(ev);
        if(line != null){

            handle = new Point(new Vec2(0,0));
            line.adjust(handle, pt);

            line.bind(handle)
        }
        else{
            var circle = get_circle(ev);
            if(circle != null){

                handle = new Point(new Vec2(0,0));
                circle.adjust(handle, pt);

                circle.bind(handle)
            }
            else{

                handle = new Point(pt);
            }
        }
    }
    else{
        handle.select(true);
    }

    return handle;
}

abstract class Tool {
    handles : Point[] = [];
    handle_move:any;
    bind_froms: Point[] = [];

    click =(ev: MouseEvent, pt:Vec2): void => {}
    pointermove = (ev: PointerEvent) : void => {}

    add_handle(handle: Point, use_this_handle_move: boolean = true){

        if(use_this_handle_move){

            handle.handle_moves.push(this.handle_move);
        }
        this.handles.push(handle);
    }

    bind(pt: Point){
        this.bind_froms.push(pt);
        pt.bind_to = this;
    }
}

abstract class Shape extends Tool {

    constructor(){
        super();
        shapes.push(this);
    }

    select(selected: boolean){
    }
}

function clear_tool(){
    var v = Array.from(G0.childNodes.values());
    for(let x of v){
        G0.removeChild(x);
        G1.appendChild(x);
    }

    for(let x of selected_shapes){
        x.select(false);
    }
    selected_shapes = [];
    tool = null;
}

function get_point(ev: MouseEvent) : Point | null{
    var pt = shapes.find(x => x.constructor.name == "Point" && (x as Point).circle == ev.target) as (Point|undefined);
    return pt == undefined ? null : pt;
}

function get_line(ev: MouseEvent) : LineSegment | null{
    var line = shapes.find(x => x.constructor.name == "LineSegment" && (x as LineSegment).line == ev.target && (x as LineSegment).handles.length == 2) as (LineSegment|undefined);
    return line == undefined ? null : line;
}

function get_circle(ev: MouseEvent) : Circle | null{
    var circle = shapes.find(x => x.constructor.name == "Circle" && (x as Circle).circle == ev.target && (x as Circle).handles.length == 2) as (Circle|undefined);
    return circle == undefined ? null : circle;
}

function lines_intersection(l1:LineSegment, l2:LineSegment) : Vec2 {
    l1.set_vecs();
    l2.set_vecs();

    /*
    l1.p1 + u l1.p12 = l2.p1 + v l2.p12

    l1.p1.x + u l1.p12.x = l2.p1.x + v l2.p12.x
    l1.p1.y + u l1.p12.y = l2.p1.y + v l2.p12.y

    l1.p12.x, - l2.p12.x   u = l2.p1.x - l1.p1.x
    l1.p12.y, - l2.p12.y   v = l2.p1.y - l1.p1.y
    
    */
    var m = new Mat2(l1.p12.x, - l2.p12.x, l1.p12.y, - l2.p12.y);
    var v = new Vec2(l2.p1.x - l1.p1.x, l2.p1.y - l1.p1.y);
    var mi = m.inv();
    var uv = mi.dot(v);
    var u = uv.x;

    return l1.p1.add(l1.p12.mul(u));
}

function calc_foot_of_perpendicular(pos:Vec2, line: LineSegment) : Vec2 {
    var p1 = line.handles[0].pos;
    var p2 = line.handles[1].pos;

    var e = p2.sub(p1).unit();
    var v = pos.sub(p1);
    var h = e.dot(v);

    var foot = p1.add(e.mul(h));

    return foot;
}


class Point extends Shape {
    pos : Vec2;
    circle : SVGCircleElement;
    handle_moves:any[];
    bind_to: Tool|null = null;

    h: number = 0;

    constructor(pt:Vec2, handle_moves:any[]= []){
        super();
        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("r", `${to_svg(5)}`);
        this.circle.setAttribute("fill", "blue");
        this.circle.addEventListener("pointerdown", this.pointerdown);
        this.circle.addEventListener("pointermove", this.pointermove);
        this.circle.addEventListener("pointerup", this.pointerup);

        this.circle.style.cursor = "pointer";

        this.pos = pt;
        this.set_pos();
    
        G2.appendChild(this.circle);

        this.handle_moves = handle_moves;
    }

    set_pos(){
        this.circle.setAttribute("cx", "" + this.pos.x);
        this.circle.setAttribute("cy", "" + this.pos.y);
    }

    select(selected: boolean){
        if(selected){
            if(! selected_shapes.includes(this)){
                selected_shapes.push(this);
                this.circle.setAttribute("fill", "orange");
            }
        }
        else{

            this.circle.setAttribute("fill", "blue");
        }
    }

    adjust_point(ev: PointerEvent){
        var pt = get_svg_point(ev);
        if(this.bind_to != null){

            if(this.bind_to.constructor.name == "LineSegment"){
                (this.bind_to as LineSegment).adjust(this, pt);
            }
            else if(this.bind_to.constructor.name == "Circle"){
                (this.bind_to as Circle).adjust(this, pt);
            }
        }
        else{

            this.pos = pt;
            this.set_pos();
        }
    }

    pointerdown =(ev: PointerEvent)=>{
        if(tool_type != "select"){
            return;
        }

        capture = this;
        this.circle.setPointerCapture(ev.pointerId);
        console.log("handle pointer down");
    }

    propagate(){
        for(let handle_move of this.handle_moves){
            handle_move(this, this.pos);
        }
    }

    pointermove =(ev: PointerEvent)=>{
        if(tool_type != "select"){
            return;
        }

        if(capture != this){
            return;
        }
        console.log("handle pointer move");

        this.adjust_point(ev);

        this.propagate();
    }

    pointerup =(ev: PointerEvent)=>{
        if(tool_type != "select"){
            return;
        }

        console.log("handle pointer up");

        this.circle.releasePointerCapture(ev.pointerId);
        capture = null;

        this.adjust_point(ev);

        this.propagate();
    }
}

class LineSegment extends Shape {    
    line : SVGLineElement;
    p1: Vec2 = new Vec2(0,0);
    p2: Vec2 = new Vec2(0,0);
    p12: Vec2 = new Vec2(0,0);
    e: Vec2 = new Vec2(0,0);
    len: number = 0;

    constructor(){
        super();
        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
        this.line.setAttribute("stroke", "navy");
        this.line.setAttribute("stroke-width", `${to_svg(3)}`);

        G0.appendChild(this.line);
    }

    
    select(selected: boolean){
        if(selected){
            if(! selected_shapes.includes(this)){
                selected_shapes.push(this);
                this.line.setAttribute("stroke", "orange");
            }
        }
        else{

            this.line.setAttribute("stroke", "navy");
        }
    }

    set_poins(p1:Vec2, p2:Vec2){
        this.line.setAttribute("x1", "" + p1.x);
        this.line.setAttribute("y1", "" + p1.y);

        this.line.setAttribute("x2", "" + p2.x);
        this.line.setAttribute("y2", "" + p2.y);

        if(this.handles.length != 0){
            this.handles[0].pos = p1;
            this.handles[0].propagate();

            if(this.handles.length == 2){
                this.handles[1].pos = p2;
                this.handles[1]

                this.propagate();
            }
        }
    }

    update_pos(){
        this.line.setAttribute("x1", "" + this.handles[0].pos.x);
        this.line.setAttribute("y1", "" + this.handles[0].pos.y);

        if(this.handles.length == 1){

            this.line.setAttribute("x2", "" + this.handles[0].pos.x);
            this.line.setAttribute("y2", "" + this.handles[0].pos.y);
        }
        else{

            this.line.setAttribute("x2", "" + this.handles[1].pos.x);
            this.line.setAttribute("y2", "" + this.handles[1].pos.y);

            this.propagate();
        }
    }

    handle_move =(handle: Point, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);
        if(idx == 0){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
        }
        else{

            this.line.setAttribute("x2", "" + pt.x);
            this.line.setAttribute("y2", "" + pt.y);
        }

        this.propagate();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.add_handle(click_handle(ev, pt));

        this.line.setAttribute("x2", "" + pt.x);
        this.line.setAttribute("y2", "" + pt.y);
        if(this.handles.length == 1){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
        }
        else{
            this.line.style.cursor = "move";
            this.set_vecs();

            clear_tool();
        }    

    }

    pointermove =(ev: PointerEvent) : void =>{
        var pt = get_svg_point(ev);

        this.line!.setAttribute("x2", "" + pt.x);
        this.line!.setAttribute("y2", "" + pt.y);
    }

    set_vecs(){
        this.p1 = this.handles[0].pos;
        this.p2 = this.handles[1].pos;
        this.p12 = this.p2.sub(this.p1);
        this.e = this.p12.unit();
        this.len = this.p12.len();
    }

    adjust(handle: Point, pt: Vec2) {
        if(this.len == 0){
            handle.h = 0;
        }
        else{
            handle.h = this.e.dot(pt.sub(this.p1)) / this.len;
        }
        handle.pos = this.p1.add(this.p12.mul(handle.h));
        handle.set_pos();
    }

    propagate(){
        this.set_vecs();
        if(this.bind_froms.length != 0){

            for(let handle of this.bind_froms){
                handle.pos = this.p1.add(this.p12.mul(handle.h));
                handle.set_pos();

                handle.propagate();
            }
        }
    }
}

class Rect extends Tool {
    is_square: boolean;
    lines : Array<LineSegment> = [];
    h : number = -1;
    in_set_rect_pos : boolean = false;

    constructor(is_square: boolean){
        super();
        this.is_square = is_square;

        for(var i = 0; i < 4; i++){

            var line = new LineSegment();
            this.lines.push(line);
        }
    }

    set_rect_pos(pt: Vec2, idx: number, clicked:boolean){
        if(this.in_set_rect_pos){
            return;
        }
        this.in_set_rect_pos = true;

        var p1 = this.handles[0].pos; 

        var p2;

        if(this.handles.length == 1){

            p2 = pt;
        }
        else{

            p2 = this.handles[1].pos; 
        }

        var p12 = p2.sub(p1);

        var e = (new Vec2(- p12.y, p12.x)).unit();

        var h;
        if(this.is_square){

            h = p12.len();
        }
        else{

            if(this.h == -1 || idx == 2){

                var pa;
                if(this.handles.length < 4){
        
                    pa = pt;
        
                }
                else{
        
                    pa = this.handles[2].pos; 
                }
        
                var p0a = pa.sub(p1);
                h = e.dot(p0a);
    
                if(this.handles.length == 4){
                    this.h = h;
                }
            }
            else{
                h = this.h;
            }
        }

        var eh = e.mul(h);
        var p3 = p2.add(eh);
        var p4 = p3.add(p1.sub(p2));

        var line1 = this.lines[0];
        line1.set_poins(p1, p2);

        var line2 = this.lines[1];
        line2.set_poins(p2, p3);

        var line3 = this.lines[2];
        line3.set_poins(p3, p4);

        var line4 = this.lines[3];
        line4.set_poins(p4, p1);

        if(clicked){
            if(this.handles.length == 2 && this.is_square){

                line1.add_handle(this.handles[1], false);
                line2.add_handle(this.handles[1], false);

                line1.line.style.cursor = "move";
                
                var handle3 = new Point(p3);
                this.handles.push(handle3);
            }

            switch(this.handles.length){
            case 1:
                line1.add_handle(this.handles[0], false);
                break;
            case 2:
                line1.add_handle(this.handles[1], false);
                line2.add_handle(this.handles[1], false);

                line1.line.style.cursor = "move";

                break;
            case 3:
                line2.add_handle(this.handles[2], false);
                line2.line.style.cursor = "move";

                var handle4 = new Point(p4);
                this.handles.push(handle4);

                line3.add_handle(this.handles[2], false);
                line3.add_handle(handle4, false);
                line3.line.style.cursor = "move";

                line4.add_handle(handle4, false);
                line4.add_handle(this.handles[0], false);
                line4.line.style.cursor = "move";
                break;
            }
        }

        if(3 <= this.handles.length){

            this.handles[2].pos = p3;
            this.handles[2].set_pos();
    
            this.handles[2].propagate();    

            if(this.handles.length == 4){

                this.handles[3].pos = p4;
                this.handles[3].set_pos();
        
                this.handles[3].propagate();    
            }
    
        }

        this.in_set_rect_pos = false;
    }

    handle_move =(handle: Point, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);
        this.set_rect_pos(pt, idx, false);
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.add_handle(click_handle(ev, pt));

        this.set_rect_pos(pt, -1, true);

        if(this.handles.length == 4){

            for(let line of this.lines){
                console.assert(line.handles.length == 2);
                line.set_vecs();
            }
            clear_tool();
        }    
    }

    pointermove =(ev: PointerEvent) : void =>{
        var pt = get_svg_point(ev);

        this.set_rect_pos(pt, -1, false);
    }
}

class Circle extends Shape {
    circle: SVGCircleElement;
    center: Vec2|null = null;
    radius: number = to_svg(1);
    in_propagate : boolean = false;
    by_diameter:boolean 

    constructor(by_diameter:boolean){
        super();

        this.by_diameter = by_diameter;

        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("fill", "none");// "transparent");
        this.circle.setAttribute("stroke", "navy");
        this.circle.setAttribute("stroke-width", `${to_svg(3)}`);     
        this.circle.setAttribute("fill-opacity", "0");
        
        G0.appendChild(this.circle);    
    }

    set_center(pt: Vec2){
        this.center = this.handles[0].pos.add(pt).mul(0.5);

        this.circle.setAttribute("cx", "" + this.center.x);
        this.circle.setAttribute("cy", "" + this.center.y);
    }

    set_radius(pt: Vec2){
        this.radius = this.center!.dist(pt);
        this.circle!.setAttribute("r", "" +  this.radius );
    }

    handle_move =(handle: Point, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);        

        if(idx == 0){

            if(this.by_diameter){

                this.handles[0].pos = pt;
                this.set_center(this.handles[1].pos);
            }
            else{
    
                this.center = pt;
                this.circle.setAttribute("cx", "" + pt.x);
                this.circle.setAttribute("cy", "" + pt.y);
            }
    
            this.set_radius(this.handles[1].pos);
        }
        else{
            if(this.by_diameter){
                this.set_center(pt);
            }

            this.set_radius(pt);
        }

        this.propagate();
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.add_handle(click_handle(ev, pt));

        if(this.handles.length == 1){

            this.center = pt;

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);
            this.circle.setAttribute("r", "" + this.radius);
        }
        else{
            if(this.by_diameter){

                this.set_center(pt);
            }
    
            this.set_radius(pt);
            this.circle.style.cursor = "move";
    
            clear_tool();
        }
    }

    pointermove =(ev: PointerEvent) : void =>{
        var pt = get_svg_point(ev);

        if(this.by_diameter){

            this.set_center(pt);
        }
        this.set_radius(pt);
    }

    adjust(handle: Point, pt: Vec2) {
        var v = pt.sub(this.center!);
        var theta = Math.atan2(v.y, v.x);

        handle.pos = new Vec2(this.center!.x + this.radius * Math.cos(theta), this.center!.y + this.radius * Math.sin(theta));
        handle.h = theta;

        handle.set_pos();
    }

    propagate(){
        if(this.in_propagate){
            return;
        }
        this.in_propagate = true;

        if(this.bind_froms.length != 0){

            for(let pt of this.bind_froms){
                pt.pos.x = this.center!.x + this.radius * Math.cos(pt.h);
                pt.pos.y = this.center!.y + this.radius * Math.sin(pt.h);
                pt.set_pos();

                pt.propagate();
            }
        }

        this.in_propagate = false;
    }
}

class Triangle extends Tool {
    lines : Array<LineSegment> = [];

    click =(ev: MouseEvent, pt:Vec2): void =>{
        var line = new LineSegment();

        if(this.lines.length == 0){
            line.add_handle(click_handle(ev, pt));
        }
        else{

            var last_line = array_last(this.lines);
            var handle = click_handle(ev, pt);
            last_line.add_handle(handle);
            last_line.update_pos();
            last_line.line.style.cursor = "move";

            line.add_handle(handle);
        }

        if(this.lines.length == 2){

            var handle1 = this.lines[0].handles[0];

            line.add_handle(handle1);
            line.line.style.cursor = "move";

            clear_tool();
        }

        this.lines.push(line);
        line.update_pos();
    }

    pointermove =(ev: PointerEvent) : void =>{
        var last_line = array_last(this.lines);
        last_line.pointermove(ev);
    }
}

class TextBox extends Shape {
    static dialog : HTMLDialogElement;
    static text_box : TextBox;    
    rect   : SVGRectElement;
    div : HTMLDivElement | null = null;
    clicked_pos : Vec2|null = null;

    static ontypeset(self: TextBox){
        var rc = self.div!.getBoundingClientRect();
        self.rect.setAttribute("width", `${to_svg(rc.width)}`);

        var h = to_svg(rc.height);
        self.rect.setAttribute("y", `${self.clicked_pos!.y - h}`);
        self.rect.setAttribute("height", `${h}`);
    }

    static ok_click(){
        var text = (document.getElementById("text-box-text") as HTMLTextAreaElement).value;
        TextBox.text_box.div!.innerHTML = make_html_lines(text);
        TextBox.dialog.close();
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        MathJax.Hub.Queue([TextBox.ontypeset, TextBox.text_box]);
    }

    static init(){
        TextBox.dialog = document.getElementById('text-box-dlg') as HTMLDialogElement;
        (document.getElementById("text-box-ok") as HTMLInputElement).addEventListener("click", TextBox.ok_click);
    }

    constructor(){
        super();
        TextBox.text_box = this;
        this.rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    }

    click =(ev: MouseEvent, pt:Vec2) : void =>{
        this.clicked_pos = pt;

        this.rect.setAttribute("x", "" + pt.x);
        this.rect.setAttribute("y", "" + pt.y);
        this.rect.setAttribute("width", `${to_svg(1)}`);
        this.rect.setAttribute("height", `${to_svg(1)}`);
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke", "navy");
        this.rect.setAttribute("stroke-width", `${to_svg(3)}`);

        G1.appendChild(this.rect);

        var ev = window.event as MouseEvent;

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.left  = `${ev.pageX}px`;
        this.div.style.top   = `${ev.pageY}px`;
        this.div.style.backgroundColor = "cornsilk"
        document.body.appendChild(this.div);

        TextBox.dialog.showModal();
        clear_tool();
    }
}

class Midpoint extends Tool {
    midpoint : Point | null = null;

    calc_midpoint(){
        var p1 = this.handles[0].pos;
        var p2 = this.handles[1].pos;

        return new Vec2((p1.x + p2.x)/2, (p1.y + p2.y)/2);
    }

    handle_move =(handle: Point, pt: Vec2)=>{
        this.midpoint!.pos = this.calc_midpoint();
        this.midpoint!.set_pos();

        this.midpoint!.propagate();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.add_handle(click_handle(ev, pt));

        if(this.handles.length == 2){

            this.midpoint = new Point( this.calc_midpoint() );

            clear_tool();
        }
    }
}


class Perpendicular extends Tool {
    line : LineSegment | null = null;
    foot : Point | null = null;
    perpendicular : LineSegment | null = null;
    in_handle_move: boolean = false;

    handle_move =(handle: Point, pt: Vec2)=>{
        if(this.in_handle_move){
            return;
        }
        this.in_handle_move = true;

        this.foot!.pos = calc_foot_of_perpendicular(this.handles[0].pos, this.line!);
        this.foot!.set_pos();

        this.foot!.propagate();

        this.perpendicular!.set_poins(this.handles[0].pos, this.foot!.pos);

        this.in_handle_move = false;
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        if(this.handles.length == 0){

            this.add_handle(click_handle(ev, pt));
        }
        else {

            this.line = get_line(ev);
            if(this.line == null){
                return;
            }

            this.line.handles[0].handle_moves.push(this.handle_move);
            this.line.handles[1].handle_moves.push(this.handle_move);

            this.foot = new Point( calc_foot_of_perpendicular(this.handles[0].pos, this.line!) );

            this.perpendicular = new LineSegment();
            this.perpendicular.line.style.cursor = "move";
            this.perpendicular.add_handle(this.handles[0]);
            this.perpendicular.add_handle(this.foot, false);

            this.perpendicular.set_vecs();
            this.perpendicular.update_pos();

            clear_tool();
        }
    }
}


class Intersection extends Shape {
    lines : LineSegment[] = [];
    intersection : Point|null = null;

    handle_move =(handle: Point, pt: Vec2)=>{
        this.intersection!.pos = lines_intersection(this.lines[0], this.lines[1]);
        this.intersection!.set_pos();
        this.intersection!.propagate();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        var line = get_line(ev);
        
        if(line != null){
            this.lines.push(line);

            if(this.lines.length == 1){


                line.select(true);
            }
            else{

                var v = lines_intersection(this.lines[0], this.lines[1]);
                this.intersection = new Point(v);

                for(let line2 of this.lines){

                    line2.handles[0].handle_moves.push(this.handle_move);
                    line2.handles[1].handle_moves.push(this.handle_move);
                }

                clear_tool();
            }
        }
    }

    pointermove = (ev: PointerEvent) : void => {
    }
}

class Angle extends Shape {
    lines : LineSegment[] = [];
    ts : number[] = [];
    arc: SVGPathElement|null = null;

    static current: Angle;

    draw_arc(){
        var line1 = this.lines[0];
        var line2 = this.lines[1];

        var q1 = line1.p1.add(line1.p12.mul(this.ts[0]));
        var q2 = line2.p1.add(line2.p12.mul(this.ts[1]));

        var p = lines_intersection(this.lines[0], this.lines[1]);

        var sign1 = Math.sign(q1.sub(p).dot(line1.e));
        var sign2 = Math.sign(q2.sub(p).dot(line2.e));

        var r = to_svg(40);        
        var p1 = p.add(this.lines[0].e.mul(r * sign1));
        var p2 = p.add(this.lines[1].e.mul(r * sign2));

        var theta1 = Math.atan2(q1.y - p.y, q1.x - p.x);
        var theta2 = Math.atan2(q2.y - p.y, q2.x - p.x);

        if(theta1 < 0){
            theta1 += 2 * Math.PI;
        }
        if(theta2 < 0){
            theta2 += 2 * Math.PI;
        }
        
        var d_theta = theta2 - theta1;
        if(d_theta < 0){
            d_theta += 2 * Math.PI;
        }

        var large_arc_sweep_flag = (Math.PI < d_theta ? 1 : 0);
        console.log(`${theta1} ${theta2} d_theta:${d_theta} large_arc_sweep_flag:${large_arc_sweep_flag}`);

        var d = `M${p1.x} ${p1.y} A ${r} ${r} 0 ${large_arc_sweep_flag} 1 ${p2.x} ${p2.y}`;

        this.arc!.setAttribute("d", d);
    }

    handle_move =(handle: Point, pt: Vec2)=>{
        this.draw_arc();
    }


    ok_click(){
        console.log("angle dlg ok click");
        this.arc!.setAttribute("stroke", angle_dlg_color.value.trim());

        angle_dlg.close();
    }


    static init(){
        angle_dlg = document.getElementById('angle-dlg') as HTMLDialogElement;
        angle_dlg_ok = document.getElementById('angle-dlg-ok') as HTMLInputElement;
        angle_dlg_color = document.getElementById('angle-dlg-color') as HTMLInputElement;

        angle_dlg.addEventListener("keydown", ev=>{
            if(ev.key == 'Enter'){
                Angle.current.ok_click();
            }    
        });

        angle_dlg_ok.addEventListener("click", ev=>{
            Angle.current.ok_click();    
        });
    
    }

    arc_click = (ev: MouseEvent)=>{
        Angle.current = this;
        angle_dlg_color.value = this.arc!.getAttribute("stroke")!;

        angle_dlg.showModal();
        // angle_dlg_ok.removeEventListener("click", this.ok_click);
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        var line = get_line(ev);
        
        if(line != null){
            this.lines.push(line);

            var t = pt.sub(line.p1).dot(line.e) / line.len;
            this.ts.push(t);

            if(this.lines.length == 1){


                line.select(true);
            }
            else{
                this.arc = document.createElementNS("http://www.w3.org/2000/svg","path");

                this.arc.setAttribute("fill", "none");
                this.arc.setAttribute("stroke", "red");
                this.arc.setAttribute("stroke-width", `${to_svg(2)}`);
                this.arc.addEventListener("click", this.arc_click);
                this.arc.style.cursor = "pointer";

                this.draw_arc();
        
                G0.appendChild(this.arc);

                for(let line2 of this.lines){

                    line2.handles[0].handle_moves.push(this.handle_move);
                    line2.handles[1].handle_moves.push(this.handle_move);
                }

                clear_tool();
            }
        }
    }

    pointermove = (ev: PointerEvent) : void => {
    }
}

function tool_click(){
    tool_type = (document.querySelector('input[name="tool-type"]:checked') as HTMLInputElement).value;  
}

function svg_click(ev: MouseEvent){
    if(capture != null){
        return;
    }

    var pt = get_svg_point(ev);

    if(tool == null){
        switch(tool_type){
            case "point":
            new Point(pt);
            break;

            case "midpoint":
            tool = new Midpoint();
            break;

            case "perpendicular":
            tool = new Perpendicular()
            break;
    
            case "line-segment":
            tool = new LineSegment();
            break;

            case "rect":
            tool = new Rect(false);
            break;

            case "square":
            tool = new Rect(true);
            break;
                
            case "circle1":    
            tool = new Circle(false);
            break;
                
            case "circle2":    
            tool = new Circle(true);
            break;
    
            case "triangle":
            tool = new Triangle();
            break;
    
            case "intersection":
                tool = new Intersection();
                break;

            case "angle":
            tool = new Angle();
            break;

            case "text-box":
            tool = new TextBox();
            break;
        } 
    }

    if(tool != null){

        tool.click(ev, pt);
    }
}

function svg_pointermove(ev: PointerEvent){
    if(capture != null){
        return;
    }

    if(tool != null){
        tool.pointermove(ev);
    }
}

export function init_draw(){
    svg = document.getElementById("main-svg") as unknown as SVGSVGElement;

    CTM = svg.getCTM()!;
    CTMInv = CTM.inverse();

    var rc = svg.getBoundingClientRect() as DOMRect;
    svg_ratio = svg.viewBox.baseVal.width / rc.width;

    G0 = document.createElementNS("http://www.w3.org/2000/svg","g");
    G1 = document.createElementNS("http://www.w3.org/2000/svg","g");
    G2 = document.createElementNS("http://www.w3.org/2000/svg","g");

    G0.setAttribute("transform", "matrix(1, 0, 0, -1, 0, 0)");
    G1.setAttribute("transform", "matrix(1, 0, 0, -1, 0, 0)");
    G2.setAttribute("transform", "matrix(1, 0, 0, -1, 0, 0)");

    svg.appendChild(G0);
    svg.appendChild(G1);
    svg.appendChild(G2);

    svg.addEventListener("click", svg_click);
    svg.addEventListener("pointermove", svg_pointermove);

    TextBox.init();

    var tool_types = document.getElementsByName("tool-type");
    for(let x of tool_types){
        x.addEventListener("click", tool_click);
    }

    Angle.init();
}

}