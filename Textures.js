
var canvas;
var gl;


var vertices = [];
var indices = [];

var planet = 2;
var ground = 1;
var light = 1;


var eye = vec3(1, .5, 0);
var at = vec3(0, 0, 0);
var up = vec3(0, 1, 0);


var picking = false;


var sphereX = 0;
var sphereY = 0;
var sphereZ = 0;


var indexMark1, indexMark2;

var planetOver = false;


var lightPosition = vec4(3.0, 3.0, 2.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 100.0;

var ambientColor, diffuseColor, specularColor;

var lightX=3, lightY=3, lightZ=0;


function scale( x, y, z )
{
    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    return result;
}

// A simple data structure for our vertex data
function Vertex(position, texCoord, normal)
{
    var vertex =  [
            //Offset = 0
            position[0], position[1], position[2], 
            // Offset = 3
            normal[0], normal[1], normal[2], 
            //Offset = 6
            texCoord[0], texCoord[1] 
            //Size = Offset = 8 
        ];

    return vertex;
}

//Hard coded offsets and size because javascript doesn't have c style structs and sizeof operator
Vertex.offsetPosition = 0 * Float32Array.BYTES_PER_ELEMENT;
Vertex.offsetNormal = 3 * Float32Array.BYTES_PER_ELEMENT;
Vertex.offsetTexCoord = 6 * Float32Array.BYTES_PER_ELEMENT;
Vertex.size = 8 * Float32Array.BYTES_PER_ELEMENT;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );

    // Load shaders
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

	
	ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);


    // Generate the data for both a plane and a sphere
    GeneratePlane(indices, vertices);
    GenerateSphere(indices, vertices);
    indexMark1 = indices.length-6;
    
    GenerateSphere(indices, vertices);
	indexMark2 = indices.length-6;

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate our shader variables with the data from our vertices buffer
    // Data packed as {(position, normal, textureCoord),(position, normal, textureCoord)...}
    // Stride = Vertex.size = sizeof(Vertex)
    // Offset of position data = Vertex.offsetPosition = offsetof(Vertex, position)

    // If you don't understand what stride and offset do look at the documentation...
    // https://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttribPointer.xml

    var aPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, Vertex.size, Vertex.offsetPosition);
    gl.enableVertexAttribArray( aPosition );

    // We didn't actually use aNormal in the shader so it will warn us. However if lighting was added they would be used.
    // INVALID_VALUE: vertexAttribPointer: index out of range 
    // INVALID_VALUE: enableVertexAttribArray: index out of range 
    var aNormal = gl.getAttribLocation( program, "aNormal" );
    gl.vertexAttribPointer( aNormal, 3, gl.FLOAT, false, Vertex.size, Vertex.offsetNormal );
    gl.enableVertexAttribArray( aNormal );

    var aTextureCoord = gl.getAttribLocation( program, "aTextureCoord" );
    gl.vertexAttribPointer( aTextureCoord, 2, gl.FLOAT, false, Vertex.size, Vertex.offsetTexCoord);
    gl.enableVertexAttribArray( aTextureCoord );


    gl.uniform1i( gl.getUniformLocation( program, "textureUnit0" ), 0); //Already 0 but lets be explicit

    //A texture that doesn't repeat and has bilinear filtering
    	//var texture0 = CreateTexture('earth.jpg');
    var texture0 = CreateTexture('sun.jpg');
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    //A texture the repeats with nearest filtering
    var texture1 = CreateTexture('Checker.png');
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    
    var texture2 = CreateTexture('moon.jpg');
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    
    document.getElementById("remove_texture").onclick = function(event) {
    	texture0 = CreateTexture('White.png');
    	gl.bindTexture(gl.TEXTURE_2D, texture0);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    	
    	texture1 = CreateTexture('White.png');
    	gl.bindTexture(gl.TEXTURE_2D, texture1);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    };
    
    document.getElementById("checker_texture").onclick = function(event) {
    	texture0 = CreateTexture('Checker.png');
    	gl.bindTexture(gl.TEXTURE_2D, texture0);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    	
    	texture1 = CreateTexture('Checker.png');
    	gl.bindTexture(gl.TEXTURE_2D, texture1);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    	
    };
    
    
    document.getElementById("ground_texture").onclick = function(event) {
    	switch(ground) {
    		case 1:
    			texture1 = CreateTexture('ground.jpg');
    			//ground++;
    			//document.getElementById("ground_texture").innerHTML = "nextText";
    			break;	
    	}
    	gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    	
    };
    
    
    document.getElementById("planet_texture").onclick = function(event) {
    	switch(planet) {
    		case 1:
    			texture0 = CreateTexture('sun.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Mercury";
    			break;
    		case 2:
    			texture0 = CreateTexture('mercury.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Venus";
    			break;
    		case 3:
    			texture0 = CreateTexture('venus.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Earth";
    			break;
    		case 4:
    			texture0 = CreateTexture('earth.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Mars";
    			break;
    		case 5:
    			texture0 = CreateTexture('mars.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Jupiter";
    			break;
    		case 6:
    			texture0 = CreateTexture('jupiter.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Saturn";
    			break;
    		case 7:
    			texture0 = CreateTexture('saturn.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Uranus";
    			break;
    		case 8:
    			texture0 = CreateTexture('uranus.jpg');
    			planet++;
    			document.getElementById("planet_texture").innerHTML = "Neptune";
    			break;
    		case 9:
    			texture0 = CreateTexture('neptune.jpg');
    			planet = 1;
    			document.getElementById("planet_texture").innerHTML = "Sun";
    			break;
    		
    		
    	}
    	
    	gl.bindTexture(gl.TEXTURE_2D, texture0);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    
    document.getElementById("toggle_lighting").onclick = function(event) {
    	
    	
    	if(light == 1) {
    		
    		lightAmbient = vec4(1.0, 1.0, 1.0, 1.0 );
    		
    		light = 0;
    		document.getElementById("toggle_lighting").innerHTML = "Add Lighting";
    	}
    	else {
    		
    		lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
    		light = 1;
    		document.getElementById("toggle_lighting").innerHTML = "Remove Lighting";
    	}
    	
    	ambientProduct = mult(lightAmbient, materialAmbient);
    	
    	gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    	
    };
    
    
    lightPosition = vec4(lightX, lightY, lightZ, 0.0 );
        
        gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    
    
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );
       
	document.getElementById("picking").onclick = function(event) {
		
		if(picking) {
			picking = false;
			document.getElementById("picking").innerHTML = "Enable Picking";
		}
		else {
			picking = true;
			document.getElementById("picking").innerHTML = "Disable Picking";
			
			eye = vec3(1, .5, 0);
			at = vec3(0, 0, 0);
			up = vec3(0, 1, 0);
		}
		
	};
       
    window.onkeydown = function( event ) {
		
		// Adjust tetrahedron based on key.
		
        var key = String.fromCharCode(event.keyCode);
        switch( key ) {
        	// CAMERA
        	case 'W':
        		at[0] -= .05;
        		eye[0] -= .05;
        		break;
        	case 'S':
        		at[0] += .05;
        		eye[0] += .05;
        		break;	
        	
        	case 'A':
        		at[2] += .05;
        		eye[2] += .05;
        		break;
        	case 'D':
        		at[2] -= .05;
        		eye[2] -= .05;
        		break;
        	
        	case 'R':
        		at[1] += .05;
        		break;
        	case 'F':
        		at[1] -= .05;
        		break;
        		
        	case 'Q':
        		at[2] += .05;
        		break;
        	case 'E':
        		at[2] -= .05;
        		break;
        
        	// SPHERE
        
        	case 'I':
        		sphereX -= .05;
        		break;
        	case 'K':
        		sphereX += .05;
        		break;
        	case 'J':
        		sphereZ += .05;
        		break;
        	case 'L':
        		sphereZ -= .05;
        		break;
        
        
        }
        
       
        //modelViewMatrix = lookAt(eye, at, up);
    };
    
    
    canvas.onmousemove = function(event) {
    	if(picking) {
    		
    		var x = event.clientX;
    		var y = event.clientY;
    		var center = 265;
    		var radius = 125;
    	
    		if(!planetOver && Math.pow(x-center, 2) + Math.pow(y-center, 2) <= Math.pow(radius, 2)) {
    		
    			texture0 = CreateTexture('red.jpg');
    			gl.bindTexture(gl.TEXTURE_2D, texture0);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    			
    			planetOver = true;

   		 	}
   		 	
   		 	else if(planetOver && Math.pow(x-center, 2) + Math.pow(y-center, 2) > Math.pow(radius, 2)) {
   		 		planetOver = false;
   		 		
   		 		texture0 = CreateTexture('sun.jpg');
   		 		gl.bindTexture(gl.TEXTURE_2D, texture0);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
   		 	}
    	
    	}
    		
    };
    
    document.onclick = function(event) {
    	//alert(event.clientY);
    };

    //Rendering this scene will warn about not complete textures until they are loaded.
    var myVar = setInterval
    (
        function () 
        {
            Render(texture0, texture1, texture2);
        }, 16
    );
};

function CreateTexture(file) 
{
    var texture = gl.createTexture();
    var image = new Image();

    image.onload = function() 
    {
        initTexture(image, texture);
    }
    image.src = file;

    return texture;
}

function initTexture(image, texture) {

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}

function GeneratePlane(indices, vertices)
{
    //The texture is in wrap = repeat so access outside the 0-1 mapped back into range.
    vertices.push(Vertex(vec3(-1, 0, -1), vec2(0, 0), vec3(0, 1, 0)));
    vertices.push(Vertex(vec3(-1, 0, 1), vec2(10, 0), vec3(0, 1, 0)));
    vertices.push(Vertex(vec3(1, 0, 1), vec2(10, 10), vec3(0, 1, 0)));
    vertices.push(Vertex(vec3(1, 0, -1), vec2(0, 10), vec3(0, 1, 0)));
    indices.push(0, 1, 2, 0, 2, 3);
}

function GenerateSphere(indices, vertices)
{

    var SPHERE_DIV = 25;

    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;

    var verticesBegin = vertices.length;

    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++) 
    {
        aj = j * Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);

        for (i = 0; i <= SPHERE_DIV; i++) 
        {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);

            var x = si * sj;
            var y = cj;      
            var z = ci * sj; 
            vertices.push(Vertex(vec3(x, y, z), vec2(i/SPHERE_DIV, (1 - y)/2), vec3(x, y, z)));

        }
    }

    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++) 
    {
        for (i = 0; i < SPHERE_DIV; i++) 
        {
            p1 = j * (SPHERE_DIV+1) + i;
            p2 = p1 + (SPHERE_DIV+1);

            indices.push(p1 + verticesBegin);
            indices.push(p2 + verticesBegin);
            indices.push(p1 + 1 + verticesBegin);

            indices.push(p1 + 1 + verticesBegin);
            indices.push(p2 + verticesBegin);
            indices.push(p2 + 1 + verticesBegin);
        }
    }
}

Render.time = 0;
function Render(texture0, texture1, texture2)
{
    Render.time += .16;
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    //View and projection are the same for both objects
    var projection = perspective(90, 1.0, 0.01, 50.0);
    //var view = lookAt(vec3(1, .5, 0), vec3(0, 0, 0), vec3(0, 1, 0));
    var view = lookAt(eye, at, up);
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "projection" ), false, flatten(projection));

	
//lightPosition = mult(mult(translate(0,0,0), scale(.5,.5,.5)),rotate(Render.time*2, vec3(0,1,0)));
	//lightPosition = mult(lightPosition, rotate(Render.time*2, vec3(0,1,0)));
    //gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), false, flatten(lightPosition) );

    //PLANE
    //Bind the texture we want to use
    gl.bindTexture(gl.TEXTURE_2D, texture1); //assuming activeTexture = TEXTURE0

    var model = mult(translate(0, -1, 0), scale(2, 2, 2));
    var modelView = mult(view, model);
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "modelView" ), false, flatten(modelView));

    //Draw the 6 indices of the plane
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    //END PLANE

    //SPHERE
    gl.bindTexture(gl.TEXTURE_2D, texture0); //assuming activeTexture = TEXTURE0

    var model = mult(mult(translate(sphereX, sphereY, sphereZ), scale(.5, .5, .5)), rotate(Render.time*2, vec3(0, 1, 0)));
    var modelView = mult(view, model);
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "modelView" ), false, flatten(modelView));

    //Draw the indices of the sphere offset = 6 indices in the plane * sizeof(UNSIGNED_SHORT)
    //gl.drawElements(gl.TRIANGLES, indices.length-6, gl.UNSIGNED_SHORT, 6 * Uint16Array.BYTES_PER_ELEMENT);
    gl.drawElements(gl.TRIANGLES, indexMark1, gl.UNSIGNED_SHORT, 6 * Uint16Array.BYTES_PER_ELEMENT);
    
    //MOON
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    var model = mult(mult(translate(sphereX+Math.cos(Render.time*.1)*.6, sphereY+.25, sphereZ+Math.sin(Render.time*.1)*.6), scale(.1, .1, .1)), rotate(Render.time*8, vec3(0,1,0)));
    var modelView = mult(view, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelView"), false, flatten(modelView));
    
    gl.drawElements(gl.TRIANGLES, indexMark2, gl.UNSIGNED_SHORT, 6 * Uint16Array.BYTES_PER_ELEMENT);
    //END SPHERE
}

