/// <reference path="util.ts" />
namespace MathMemo{
declare var MathJax:any;
var capture: any = null

var property_div : HTMLDivElement;

class Path {
}

class Vec2 {
    x: number;
    y: number;

    constructor(x:number, y: number){
        this.x = x;
        this.y = y;
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

var svg : SVGSVGElement;

var CTM : DOMMatrix;
var CTMInv : DOMMatrix;
var svg_ratio: number;

function to_svg(x:number){
    return `${x * svg_ratio}`;
}

function get_svg_point(ev: MouseEvent | PointerEvent){
	var point = svg.createSVGPoint();
	
    //画面上の座標を取得する．
    point.x = ev.offsetX;
    point.y = ev.offsetY;

    //座標に逆行列を適用する．
    var p = point.matrixTransform(CTMInv);    

    return new Vec2(p.x, p.y);
}

var tool_type = "line-segment";

abstract class Shape {
    handles : Point[] = [];
    handle_move:any;

    click =(ev: MouseEvent, pt:Vec2): void => {}
    pointermove = (ev: PointerEvent) : void => {}

    constructor(){
        shapes.push(this);
    }

    add_handle(ev: MouseEvent, pt:Vec2){
        var handle = get_point(ev);
        if(handle == null){

            handle = new Point(pt, [this.handle_move]);
        }
        else{
            svg.appendChild( svg.removeChild(handle.circle) );
            handle.handle_moves.push(this.handle_move);
        }
        this.handles.push(handle);
    }
}

var shapes: Shape[] = [];

function get_point(ev: MouseEvent) : Point | null{
    var pt = shapes.find(x => x.constructor.name == "Point" && (x as Point).circle == ev.target) as (Point|undefined);
    return pt == undefined ? null : pt;
}


class Point extends Shape {
    pos : Vec2;
    down_pos: Vec2|null = null;
    circle : SVGCircleElement;
    handle_moves:any[];

    constructor(pt:Vec2, handle_moves:any[]= []){
        super();
        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("r", to_svg(5));
        this.circle.setAttribute("fill", "blue");
        this.circle.addEventListener("pointerdown", this.pointerdown);
        this.circle.addEventListener("pointermove", this.pointermove);
        this.circle.addEventListener("pointerup", this.pointerup);

        this.circle.style.cursor = "move";

        this.pos = pt;
        this.set_pos();
    
        svg.appendChild(this.circle);

        this.handle_moves = handle_moves;
    }

    set_pos(){
        this.circle.setAttribute("cx", "" + this.pos.x);
        this.circle.setAttribute("cy", "" + this.pos.y);
    }

    pointerdown =(ev: PointerEvent)=>{
        if(tool_type != "select"){
            return;
        }

        capture = this;
        this.circle.setPointerCapture(ev.pointerId);
        this.down_pos = get_svg_point(ev);
        console.log("handle pointer down");
    }

    pointermove =(ev: PointerEvent)=>{
        if(tool_type != "select"){
            return;
        }

        if(capture != this){
            return;
        }
        console.log("handle pointer move");

        this.pos = get_svg_point(ev);
        this.set_pos();

        for(let handle_move of this.handle_moves){
            handle_move(this, ev, this.pos);
        }
    }

    pointerup =(ev: PointerEvent)=>{
        if(tool_type != "select"){
            return;
        }

        console.log("handle pointer up");

        this.circle.releasePointerCapture(ev.pointerId);
        capture = null;

        this.pos = get_svg_point(ev);
        this.set_pos();

        for(let handle_move of this.handle_moves){
            handle_move(this, ev, this.pos);
        }
    }
}

class LineSegment extends Shape {    
    line : SVGLineElement;

    constructor(){
        super();
        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
        svg.appendChild(this.line);
    }

    handle_move =(handle: Point, ev:PointerEvent, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);
        if(idx == 0){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
        }
        else{

            this.line.setAttribute("x2", "" + pt.x);
            this.line.setAttribute("y2", "" + pt.y);
        }
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.add_handle(ev, pt);

        this.line.setAttribute("x2", "" + pt.x);
        this.line.setAttribute("y2", "" + pt.y);
        if(this.handles.length == 1){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
            this.line.setAttribute("stroke", "navy");
            this.line.setAttribute("stroke-width", to_svg(3));
        }
        else{
            tool = null;
        }    
    }

    pointermove =(ev: PointerEvent) : void =>{
        if(ev.target != null && ev.target.constructor.name == "SVGCircleElement"){
            return;
        }

        var pt = get_svg_point(ev);

        this.line!.setAttribute("x2", "" + pt.x);
        this.line!.setAttribute("y2", "" + pt.y);
    }
}

class Rect extends Shape {
    lines : SVGLineElement[];
    h : number = -1;

    constructor(){
        super();
        this.lines = [];
        for(let i = 0; i < 4; i++){
            var line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("stroke", "navy");
            line.setAttribute("stroke-width", to_svg(3));
            this.lines.push(line);
            svg.appendChild(line);
        }
    }

    set_rect_pos(pt: Vec2|null, idx: number){
        console.assert(pt != null || this.handles.length == 3);

        var line0 = this.lines[0];

        var p1 = this.handles[0].pos; 
        line0.setAttribute("x1", "" + p1.x);
        line0.setAttribute("y1", "" + p1.y);

        if(this.handles.length == 1){

            line0.setAttribute("x2", "" + pt!.x);
            line0.setAttribute("y2", "" + pt!.y);
            return;
        }

        var p2 = this.handles[1].pos; 
        line0.setAttribute("x2", "" + p2.x);
        line0.setAttribute("y2", "" + p2.y);

        var line1 = this.lines[1];
        line1.setAttribute("x1", "" + p2.x);
        line1.setAttribute("y1", "" + p2.y);

        var p12 = p2.sub(p1);

        var e = (new Vec2(- p12.y, p12.x)).unit();

        var h;
        if(this.h == -1 || idx == 2){

            var pa;
            if(this.handles.length == 2){
    
                pa = pt!;
    
            }
            else{
    
                pa = this.handles[2].pos; 
            }
    
            var p0a = pa.sub(p1);
            h = e.dot(p0a);

            if(this.handles.length == 3){
                this.h = h;
            }
        }
        else{
            h = this.h;
        }

        var p32 = e.mul(h);
        var p3 = p2.add(p32);

        line1.setAttribute("x2", "" + p3.x);
        line1.setAttribute("y2", "" + p3.y);

        var p4 = p3.add(p1.sub(p2));

        var line2 = this.lines[2];
        line2.setAttribute("x1", "" + p3.x);
        line2.setAttribute("y1", "" + p3.y);

        line2.setAttribute("x2", "" + p4.x);
        line2.setAttribute("y2", "" + p4.y);

        var line3 = this.lines[3];
        line3.setAttribute("x1", "" + p4.x);
        line3.setAttribute("y1", "" + p4.y);

        line3.setAttribute("x2", "" + p1.x);
        line3.setAttribute("y2", "" + p1.y);

        if(this.handles.length == 2){

            return;
        }

        this.handles[2].pos = p3;
        this.handles[2].set_pos();
    }

    handle_move =(handle: Point, ev:PointerEvent, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);
        this.set_rect_pos(null, idx);
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.add_handle(ev, pt);

        this.set_rect_pos(pt, -1);

        if(this.handles.length == 3){

            tool = null;
        }    
    }

    pointermove =(ev: PointerEvent) : void =>{
        if(ev.target != null && ev.target.constructor.name == "SVGCircleElement"){
            return;
        }

        var pt = get_svg_point(ev);

        this.set_rect_pos(pt, -1);
    }
}

class Circle extends Shape {
    circle: SVGCircleElement;
    radius: number = parseInt(to_svg(1), 10);

    constructor(){
        super();
        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        svg.appendChild(this.circle);    
    }

    set_radius(pt: Vec2){
        this.radius = this.handles[0].pos.dist(pt);
        this.circle!.setAttribute("r", "" +  this.radius );
    }

    handle_move =(handle: Point, ev:PointerEvent, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);
        
        if(idx == 0){

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);

            this.set_radius(this.handles[1].pos);
        }
        else{

            this.set_radius(pt);
        }
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.add_handle(ev, pt);

        if(this.handles.length == 1){

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);
            this.circle.setAttribute("r", "" + this.radius);
            this.circle.setAttribute("fill", "transparent");
            this.circle.setAttribute("stroke", "navy");
            this.circle.setAttribute("stroke-width", to_svg(3));        
        }
        else{
            this.set_radius(pt);
    
            tool = null;
        }
    }

    pointermove =(ev: PointerEvent) : void =>{
        if(ev.target != null && ev.target.constructor.name == "SVGCircleElement"){
            return;
        }

        var pt = get_svg_point(ev);

        this.set_radius(pt);
    }
}


class Triangle extends Shape {
    points : Array<Vec2> = [];
    lines : Array<SVGLineElement> = [];

    constructor(){
        super();
    }

    handle_move =(handle: Point, ev:PointerEvent, pt: Vec2)=>{
        var idx = this.handles.indexOf(handle);
        this.lines[idx].setAttribute("x1", "" + pt.x);
        this.lines[idx].setAttribute("y1", "" + pt.y);

        var idx2 = (idx + 2) % 3;
        this.lines[idx2].setAttribute("x2", "" + pt.x);
        this.lines[idx2].setAttribute("y2", "" + pt.y);
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.handles.push( new Point(pt, [this.handle_move]) );

        if(this.lines.length != 0){

            var last_line = array_last(this.lines);
            last_line.setAttribute("x2", "" + pt.x);
            last_line.setAttribute("y2", "" + pt.y);
        }           

        var line = document.createElementNS("http://www.w3.org/2000/svg","line");

        line.setAttribute("stroke", "navy");
        line.setAttribute("stroke-width", to_svg(3));

        line.setAttribute("x1", "" + pt.x);
        line.setAttribute("y1", "" + pt.y);

        if(this.lines.length != 2){
            line.setAttribute("x2", "" + pt.x);
            line.setAttribute("y2", "" + pt.y);
        }
        else{
            line.setAttribute("x2", "" + this.points[0].x);
            line.setAttribute("y2", "" + this.points[0].y);
    
            tool = null;
        }    

        svg.appendChild(line);

        this.lines.push(line);
        this.points.push(pt);        
    }

    pointermove =(ev: PointerEvent) : void =>{
        var pt = get_svg_point(ev);

        var last_line = array_last(this.lines);
        last_line.setAttribute("x2", "" + pt.x);
        last_line.setAttribute("y2", "" + pt.y);
    }
}

class TextBox extends Shape {
    static dialog : HTMLDialogElement;
    static text_box : TextBox;    
    rect   : SVGRectElement;
    div : HTMLDivElement | null = null;
    x : number = 0;
    y  : number = 0;
    width : number = 0;
    height : number = 0;

    static ontypeset(self: TextBox){
        var rc = self.div!.getBoundingClientRect();
        self.rect.setAttribute("width", `${to_svg(rc.width)}`);
        self.rect.setAttribute("height", `${to_svg(rc.height)}`);
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
        (document.getElementById("text-box-ok") as HTMLInputElement).addEventListener("click", TextBox.ok_click)
    }

    constructor(){
        super();
        TextBox.text_box = this;
        this.rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    }

    click =(ev: MouseEvent, pt:Vec2) : void =>{
        this.rect.setAttribute("x", "" + pt.x);
        this.rect.setAttribute("y", "" + pt.y);
        this.rect.setAttribute("width", to_svg(1));
        this.rect.setAttribute("height", to_svg(1));
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke", "navy");
        this.rect.setAttribute("stroke-width", to_svg(3));

        svg.appendChild(this.rect);

        var ev = window.event as MouseEvent;

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.left  = `${ev.pageX}px`;
        this.div.style.top   = `${ev.pageY}px`;
        this.div.style.backgroundColor = "cornsilk"
        document.body.appendChild(this.div);

        TextBox.dialog.showModal();
        tool = null;
    }
}

var tool : Shape | null = null;

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

            case "line-segment":
            tool = new LineSegment();
            break;

            case "rect":
            tool = new Rect();
            break;
            
            case "circle":    
            tool = new Circle();
            break;
    
            case "triangle":
            tool = new Triangle();
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
    property_div = document.getElementById("property-div") as HTMLDivElement;

    svg = document.getElementById("main-svg") as unknown as SVGSVGElement;

    CTM = svg.getCTM()!;
    CTMInv = CTM.inverse();

    var rc = svg.getBoundingClientRect() as DOMRect;
    svg_ratio = svg.viewBox.baseVal.width / rc.width;

    svg.addEventListener("click", svg_click);
    svg.addEventListener("pointermove", svg_pointermove);

    TextBox.init();

    var tool_types = document.getElementsByName("tool-type");
    for(let x of tool_types){
        x.addEventListener("click", tool_click);
    }
}

}