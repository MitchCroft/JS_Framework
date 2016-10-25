/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                 Object Definition                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: Physics
 *      Author: Mitchell Croft
 *      Date: 30/09/2016
 *
 *      Version: 1.0
 *
 *      Requires:
 *      Vec2.js
 *
 *      Purpose:
 *      Manage Physics for a number of objects that can be added
 *      and removed from the active monitoring and updating
 **/

/*
    Physics : Constructor - Intialise on file load for initial setup
    30/09/2016
*/
var Physics = new function() {
    /*  WARNING:
        Don't modify this internal object from the outside of the Physics Manager.
        Instead use properties and functions to modify these values as this 
        allows for the internal information to update itself and keep it correct.
    */
    this.__Internal__Dont__Modify__ = {
        //Store the direction and magnitude of gravity to be applied to Physics Objects
        gravity: new Vec2(),

        //Store ID progress for the current physics scene
        nextID: -1,

        //Store an array of the Physics Objects in the active physics scene
        physObjs: [],

        //How often physics calculations are run (Higher numbers will be less precise Physics but use less resources)
        timeStep: 1 / 30,

        //Calculates how much time has accumulated since the last Physics calculations
        timeAccumulation: 0,

        /*
            Physics : extender - Add additional functions and properties to the single Physics object
            30/09/2016

            @param[in] pCollection - An object containing the functions and properties to add to the 
                                     Physics object
        */
        extender: function(pCollection) {
            //Store the descriptor of the property extracted from the collection
            var description;

            //Loop through all properties inside the collection
            for (var prop in pCollection) {
                //Get the property descriptor for the prop value
                description = Object.getOwnPropertyDescriptor(pCollection, prop);

                //Apply the property if not undefined
                if (typeof description !== "undefined")
                    Object.defineProperty(Physics.__proto__, prop, description);
            }
        }
    };
};

Physics.__Internal__Dont__Modify__.extender({
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////                                                                                                            ////
    /////                                               Property Definitions                                         ////
    /////                                                                                                            ////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /*
        Physics : gravity - Get the value of gravity effecting all Physics Objects
        30/09/2016

        @return Vec2 - Returns a Vec2 object with the axis values

        Example:

        //Get the value of gravity effecting the scene
        var grav = Physics.gravity;
    */
    get gravity() {
        return this.__Internal__Dont__Modify__.gravity;
    },

    /*
        Physics : gravity - Set the direction and magnitude of gravity effecting all Physics Objects
        30/09/2016

        @param[in] pGrav - A Vec2 object holding the gravity axis values

        Example:

        //Set gravity to be acting down the screen
        Physics.gravity = new Vec2(0, 20);
    */
    set gravity(pGrav) {
        //Check that the value passed in is a Vec2
        if (!pGrav instanceof Vec2)
            throw new Error("Can not set Physics' gravity value to " + pGrav + " (Type '" + typeof pGrav + "'). Please use a Vec2 object");

        //Set the value
        this.__Internal__Dont__Modify__.gravity = pGrav;
    },

    /*
        Physics : timeStep - Get the current time step value that determines how often Physics calculations are run
        30/09/2016

        @return number - Returns the time step value as a number in seconds

        Example:

        //Get the current Physics time step
        var timeStep = Physics.timeStep;
    */
    get timeStep() {
        return this.__Internal__Dont__Modify__.timeStep;
    },

    /*
        Physics : timeStep - Set the current time step value to determine how often Physics calculations are run
        30/09/2016

        @param[in] pVal - A number representing the time step in seconds

        Example:

        //Make the physics calculations run every 1/4 of a second
        Physics.timeStep = 0.25;
    */
    set timeStep(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set the Physics time step to " + pVal + " (Type '" + typeof pVal + "') Please use a number in seconds");

        //Set the time step value
        this.__Internal__Dont__Modify__.timeStep = pVal;
    },

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////                                                                                                            ////
    /////                                                  Main Functions                                            ////
    /////                                                                                                            ////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /*
        Physics : update - Update the current physics scene at the set time step
        24/10/2016

        @param[in] pDelta - The delta time for the current cycle

        Example:

        //Update the physics manager
        Physics.update(deltaTime);
    */
    update: function(pDelta) {
        //Add the delta time to the accumulation
        this.__Internal__Dont__Modify__.timeAccumulation += pDelta;

        //Exit if not enough time has passed for the physics simulation to be run
        if (this.__Internal__Dont__Modify__.timeAccumulation < this.__Internal__Dont__Modify__.timeStep)
            return;

        //Update all of the Physics Objects in the scene
        for (var i = this.__Internal__Dont__Modify__.physObjs.length - 1; i >= 0; i--) {
            //Check the current object is active
            if (!this.__Internal__Dont__Modify__.physObjs[i].enabled) continue;

            //Update the object
            this.__Internal__Dont__Modify__.physObjs[i].update(this.__Internal__Dont__Modify__.timeAccumulation, this.__Internal__Dont__Modify__.gravity);
        }

        //Store an array of collision events to resolve
        var collisions = [];

        //Run collision checks for all Physics Objects
        var recieved = null;
        for (var i = 0; i < this.__Internal__Dont__Modify__.physObjs.length; i++) {
            //Check the current object is active
            if (!this.__Internal__Dont__Modify__.physObjs[i].enabled) continue;

            for (var j = i + 1; j < this.__Internal__Dont__Modify__.physObjs.length; j++) {
                //Check the current object is active
                if (!this.__Internal__Dont__Modify__.physObjs[j].enabled) continue;

                //Check if a collision occurs
                if ((recieved = this.__Internal__Dont__Modify__.physObjs[i].collidesWith(this.__Internal__Dont__Modify__.physObjs[j])) !== null)
                    collisions[collisions.length] = recieved;
            }
        }

        //Resolve the collision events
        for (var i = collisions.length - 1; i >= 0; i--) {
            //Extract the Physics Objects from the data object
            var first = collisions[i].first;
            var second = collisions[i].second;

            //Check if either of the objects in the collision are a trigger
            if (first.collider.isTrigger || second.collider.isTrigger) {
                //If the first is a trigger
                if (first.collider.isTrigger) first.raiseTriggerEvents(second);

                //If the second is a trigger
                if (second.collider.isTrigger) second.raiseTriggerEvents(first);

                //Continue to other collision events
                continue;
            }

            //Get the normal of the collision
            var normal = collisions[i].overlap.normalized;

            //Calculate the relative velocity
            var relVel = second.velocity.subtract(first.velocity);

            //Get the velocity along the normal
            var velAlongNormal = relVel.dot(normal);

            //Check if they are moving in opposite directions
            if (velAlongNormal > 0) continue;

            //Calculate the impulse
            var impulseLength = -1 * velAlongNormal;

            //Divide the impulse by the combined inverse masses
            impulseLength /= (first.inverseMass + second.inverseMass);

            //Get the impulse to apply
            var impulse = normal.multi(impulseLength);

            //Apply the forces 
            if (!first.isKinematic)
                first.addForce(first.velocity.subtract(impulse.multi(first.inverseMass)));
            if (!second.isKinematic)
                second.addForce(second.velocity.add(impulse.multi(second.inverseMass)));
        }

        //Reset the time accumulated
        this.__Internal__Dont__Modify__.timeAccumulation = 0;
    },

    /*
        Physics : startNewScene - Remove the previous objects from the physics scene and 
                                  prepare for new Physics Objects
        24/10/2016

        Example:

        //Clear previous physics obejcts
        Physics.startNewScene();

        //TODO: Load the next scenes required physics elements
    */
    startNewScene: function() {
        //Loop through the current objects and reset their IDs
        for (var i = this.__Internal__Dont__Modify__.physObjs.length - 1; i >= 0; i--)
            this.__Internal__Dont__Modify__.physObjs[i].__Internal__Dont__Modify__.ID = -1;

        //Clear the list of objects
        this.__Internal__Dont__Modify__.physObjs = [];

        //Reset the next ID to be given out
        this.__Internal__Dont__Modify__.nextID = -1;
    },

    /*
        Physics : addObject - Add a Physics Object to the current Physics Scene
        24/10/2016

        @param[in] pObj - A reference to the Physics Object to add to the scene

        Example:

        //Add the player's physics object to the phsyics scene
        Physics.addObject(playerPhysObj);
    */
    addObject: function(pObj) {
        //Check the object is valid
        if (!pObj instanceof PhysicsObject)
            throw new Error("Can not add " + pObj + " (Type: '" + typeof pObj + "') to the Physics Scene. Please only use PhysicsObject instances");

        //Check the object is ready to be re-added
        if (pObj.__Internal__Dont__Modify__.ID !== -1)
            throw new Error("Can not add " + pObj + " to the Physics Scene as it already belongs to another (Physics Object ID: " + pObj.__Internal__Dont__Modify__.ID + ")");

        //ID stamp the object
        pObj.__Internal__Dont__Modify__.ID = ++this.__Internal__Dont__Modify__.nextID;

        //Add the physics object to the scene
        this.__Internal__Dont__Modify__.physObjs.push(pObj);
    },

    /*
        Physics : removeObject - Remove a Physics Object from the current Physics Scene
        24/10/2016

        @param[in] pObj - A reference to the Physics Object to remove from the scene

        Example:

        //Remove the player from the physics scene
        Physics.removeObject(playerPhysObj);

        //TODO: Load next scene and add the player back to the physics manager
    */
    removeObject: function(pObj) {
        //Check there are objects that can be removed
        if (!this.__Internal__Dont__Modify__.physObjs.length)
            throw new Error("Can not remove " + pObj + " as there are no objects in the Physics Scene");

        //Check the obejct is a physics object
        if (!pObj instanceof PhysicsObject)
            throw new Error("Can not remove " + pObj + " (Type: '" + typeof pObj + "') from the Physics Scene. Please only use PhysicsObject instances");

        //Check the ID is in range of the currently deployed 
        if (pObj.__Internal__Dont__Modify__.ID > this.__Internal__Dont__Modify__.nextID)
            throw new Error("The ID stamp on " + pObj + " (" + pObj.__Internal__Dont__Modify__.ID + " is outside of the range deployed by the Physics Manager (" + (this.__Internal__Dont__Modify__.nextID + 1) + ") Are you sure this Physics Object belongs to the current Physics Scene?");

        //Check if the Physics Object belongs to a Physics Scene
        else if (pObj.__Internal__Dont__Modify__.ID === -1)
            throw new Error("Can not remove " + pObj + " as it does not belong to any Physics Scene");

        //Get the direction with which to search from
        var dir = (pObj.__Internal__Dont__Modify__.ID - this.__Internal__Dont__Modify__.physObjs[0].ID < this.__Internal__Dont__Modify__.physObjs[this.__Internal__Dont__Modify__.physObjs.length - 1].ID - pObj.__Internal__Dont__Modify__.ID ? 1 : -1);

        //Loop through to find the object
        for (var i = (dir === 1 ? 0 : this.__Internal__Dont__Modify__.physObjs.length - 1); i >= 0 && i < this.__Internal__Dont__Modify__.physObjs.length; i += dir) {
            //Look for matching objects
            if (this.__Internal__Dont__Modify__.physObjs[i] === pObj) {
                //Reset the ID of the object
                pObj.__Internal__Dont__Modify__.ID = -1;

                //Remove the object from the list
                this.__Internal__Dont__Modify__.physObjs.splice(i, 1);

                //Exit the function
                return;
            }
        }

        //Throw error if search occured with not match found
        throw new Error("Physics removeObject call failed when using " + pObj + " (ID: " + pObj.__Internal__Dont__Modify__.ID + ")");
    },
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                 Object Definition                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: CollisionData
 *      Author: Mitchell Croft
 *      Date: 24/10/2016
 *
 *      Requires:
 *      Vec2.js
 *
 *      Purpose:
 *      Provide information about a collision event between
 *      two Physics Objects. Used internally by the Physics
 *       Manager.
 **/

/*
    CollisionData : Constructor - Initialise with default values
    24/10/2016

    @param[in] pFirst - A reference to the first Physics Object that was involved
                        in the collision
    @param[in] pSecond - A reference to the second Physics Object that was involved
                         in the collision
*/
function CollisionData(pFirst, pSecond) {
    //Store the objects involved in the collision
    this.first = (pFirst instanceof PhysicsObject ? pFirst : null);
    this.second = (pSecond instanceof PhysicsObject ? pSecond : null);

    //Store information about the overlap
    this.overlap = new Vec2();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                               Force Mode Definition                                        ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: ForceMode
 *      Author: Mitchell Croft
 *      Date: 23/10/2016
 *
 *      Purpose:
 *      Name the numerical values given to the different 
 *      modes of applying force
 **/
var ForceMode = { FORCE: 0, IMPULSE: 1 };

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                 Object Definition                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: PhysicsObject
 *      Author: Mitchell Croft
 *      Date: 30/09/2016
 *
 *      Version: 1.0
 *
 *      Requires:
 *      Bounds.js
 *
 *      Purpose:
 *      Provide an object for the Physics manager object to 
 *      use and update in physics calculations
 **/

/*
    PhysicsObject : Constructor - Initialise with default values
    30/09/2016
*/
function PhysicsObject() {
    /*  WARNING:
        Don't modify this internal object from the outside of the Physics Object.
        Instead use properties and functions to modify these values as this 
        allows for the internal information to update itself and keep it correct.
    */
    this.__Internal__Dont__Modify__ = {
        //Flags if the Physics Object is active
        enabled: true,

        //Store the ID of the Physics Object in the Physics Scene
        ID: -1,

        //Store an array of events to raise in the event of a trigger 
        triggerEvents: [],

        //Store the global bounding box of the collider attached
        glbBounds: null,

        //Store the flag for if this object is kinematic
        kino: false,

        //Store the position of the object
        pos: new Vec2(),

        //Store the position altering values
        vel: new Vec2(),
        acc: new Vec2(),

        //Store the rotation of the object
        rot: 0,

        //Store the rotation altering values
        angVel: 0,
        angAcc: 0,

        //Store the mass values
        mass: 1,
        invMass: 1,

        //Store the drag values
        drag: 0.5,
        angDrag: 0.1,

        //Store a reference to the collider used on this object
        collider: null,
    };

    //Store any user desired data, to be used with associating Physics Objects with custom code
    this.storage = null;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                               Property Definitions                                         ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

PhysicsObject.prototype = {
    /*
        PhysicsObject : enabled - Get's the enabled flag of the Physics Object
        03/10/2016

        @return bool - Returns true if the Physics Object is enabled

        Example:

        //Test if the Physics Object is active
        if (playerPhysObj.enabled) {
            //TODO: Do action
        }
    */
    get enabled() {
        return this.__Internal__Dont__Modify__.enabled;
    },

    /*
        PhysicsObject : enabled - Set the enabled state of the Physics Object
        03/10/2016

        @param[in] pState - A bool value representing the new enabled state

        Example:

        //Disable the player physics object
        playerPhysObj.enabled = false;
    */
    set enabled(pState) {
        //Check state is a bool
        if (typeof pState !== "boolean")
            throw new Error("Can not set Physics Object enabled to " + pState + " (Type '" + typeof pState + "') Please use a boolean value (True/False)");

        //Set the enabled state
        this.__Internal__Dont__Modify__.enabled = pState;
    },

    /*
        PhysicsObject : isKinematic - Returns a bool representing if the Physics 
                                      Object is effected by external physics
        30/09/2016

        @return bool - Returns true if the object is effected by external physics

        Example:

        //Check if physics object is kinematic
        if (physicsObject.isKinematic) {
            //TODO: Do stuff
        }
    */
    get isKinematic() {
        return this.__Internal__Dont__Modify__.kino;
    },

    /*
        PhysicsObject : iskinematic - Sets the kinematic flag for the current Physics
                                      object
        30/09/2016

        @param[in] pState - A bool value representing if the Physics Object should be 
                            effected by external physics

        Example:

        //Set the player's physics object to kinematic
        playerPhysObj.isKinematic = true;
    */
    set isKinematic(pState) {
        //Check the state is a bool flag
        if (typeof pState !== "boolean")
            throw new Error("Can not set Physics Object (" + this.__Internal__Dont__Modify__.ID + ") kinematic to " + pState + " (Type '" + typeof pState + "') Please use a bool value");

        //Set the state
        this.__Internal__Dont__Modify__.kino = pState;

        //Reset the velocity and acceleration values
        this.__Internal__Dont__Modify__.acc.reset();
        this.__Internal__Dont__Modify__.vel.reset();
        this.__Internal__Dont__Modify__.angAcc = 0;
        this.__Internal__Dont__Modify__.angVel = 0;
    },

    /*
        PhysicsObject : position - Get's the position of the Physics Object in world space
        30/09/2016

        @return Vec2 - Returns the position as a Vec2 object

        Example:

        //Get the position of the players physics object
        var playPos = playerPhysObj.position;
    */
    get position() {
        return this.__Internal__Dont__Modify__.pos;
    },

    /*
        PhysicsObject : position - Set the position of the Physics Object in world space
        30/09/2016

        @param[in] pPos - A Vec2 object containing the new position values

        Example:

        //Reset the position of the players physics object
        playerPhysObj.position = new Vec2();
    */
    set position(pPos) {
        //Check the position is a Vec2 object
        if (!pPos instanceof Vec2)
            throw new Error("Can not set position to " + pPos + " (Type '" + typeof pPos + "') Please use a Vec2 object");

        //Set the position value
        this.__Internal__Dont__Modify__.pos = pPos;
    },

    /*
        PhysicsObject : velocity - Get's the velocity of the Physics Object
        30/09/2016

        @return Vec2 - Returns the velocity as a Vec2 object

        Example:

        //Get how fast the player is currently moving
        console.log(playerPhysObj.velocity.mag);
    */
    get velocity() {
        return this.__Internal__Dont__Modify__.vel;
    },

    /*
        PhysicsObject : velocity - Set the velocity of the Physics Object 
        30/09/2016

        @param[in] pVel - A Vec2 object containing the new velocity values

        Example:

        //Reset the velocity of the players physics object
        playerPhysObj.velocity = new Vec2();
    */
    set velocity(pVel) {
        //Check the velocity is a Vec2 object
        if (!pVel instanceof Vec2)
            throw new Error("Can not set velocity to " + pVel + " (Type '" + typeof pVel + "') Please use a Vec2 object");

        //Set the velocity value
        this.__Internal__Dont__Modify__.vel = pVel;
    },

    /*
        PhysicsObject : rotation - Get's the global rotation value of the Physics Object 
        30/09/2016

        @return number - Returns the global rotation as number in degrees

        Example:

        //Get the players physics object global rotation
        var playerRot = playerPhysObj.rotation;
    */
    get rotation() {
        return this.__Internal__Dont__Modify__.rot;
    },

    /*
        PhysicsObject : rotation - Set the global rotation value of the Physics Object
        30/09/2016

        @param[in] pRot - A number with the new rotation value in degrees

        Example:

        //Reset the players physics object global rotation
        playerPhysObj.rotation = 0;
    */
    set rotation(pRot) {
        //Check the rotation is a number
        if (typeof pRot !== "number")
            throw new Error("Can not set rotation to " + pRot + " (Type '" + typeof pRot + "') Please use a number in degrees");

        //Set the rotation value
        this.__Internal__Dont__Modify__.rot = cleanRotation(pRot);
    },

    /*
        PhysicsObject : angularVelocity - Get's the angular velocity of the Physics Object
        30/09/2016

        @return number - Returns the angular velocity as number in degrees per second

        Example:

        //Get the players physics object angular velocity
        var playerAngVel = playerPhysObj.angularVelocity;
    */
    get angularVelocity() {
        return this.__Internal__Dont__Modify__.angVel;
    },

    /*
        PhysicsObject : angularVelocity - Set the angular velocity of the Physics Object
        30/09/2016

        @param[in] pVel - A number with the angular velocity value in degrees per second

        Example:

        //Set the player to rotate a full revoloution per second
        playerPhysObj.angularVelocity = 360;
    */
    set angularVelocity(pVel) {
        //Check the velocity is a number
        if (typeof pVel !== "number")
            throw new Error("Can not set angular velocity to " + pVel + " (Type '" + typeof pVel + "') Please use a number in degrees per second");

        //Set the angular velocity value
        this.__Internal__Dont__Modify__.angVel = pVel;
    },

    /*
        PhysicsObject : mass - Get the mass of the Physics Object
        30/09/2016

        @return number - Returns a number representing the mass of the Physics Object

        Example:

        //Log the players mass
        console.log(playerPhysObj.mass);
    */
    get mass() {
        return this.__Internal__Dont__Modify__.mass;
    },

    /*
        PhysicsObject : mass - Set the mass of the Physics Object
        30/09/2016

        @param[in] pVal - A number representing the new mass of the Physics Object
                          This must be >= 0

        Example:

        //Set the mass of the players physics object
        playerPhysObj.mass = 5;
    */
    set mass(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set mass to " + pVal + " (Type '" + typeof pVal + "') Please use a number");

        //Set the mass value
        this.__Internal__Dont__Modify__.mass = Math.max(0, pVal);

        //Set the inverse mass value
        this.__Internal__Dont__Modify__.invMass = 1 / this.__Internal__Dont__Modify__.mass;
    },

    /*
        PhysicsObject : inverseMass - Get the inverse mass for the Physics Object
        25/10/2016

        @return number - Returns the inverse mass as a number

        Example:

        //Get the inverse mass of the players object
        var invMass = playerPhysObj.inverseMass;
    */
    get inverseMass() {
        return this.__Internal__Dont__Modify__.invMass;
    },

    /*
        PhysicsObject : drag - Get's the drag of the Physics Object
        30/09/2016

        @return number - Returns a number representing the artificial drag scale 
                         acting on the Physics Object velocity

        Example:

        //Get the drag acting on the players physics object
        var drag = playerPhysObj.drag;
    */
    get drag() {
        return this.__Internal__Dont__Modify__.drag;
    },

    /*
        PhysicsObject : drag - Set the drag acting on the Physics Object
        30/09/2016

        @param[in] pVal - A number representing the drag scale acting on the Physics
                          Objects velocity (0 - 1)

        Example:

        //Remove all of the drag acting on the player
        playerPhysObj.drag = 0;
    */
    set drag(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set drag to " + pVal + " (Type '" + typeof pVal + "') Please use a number between 0 and 1");

        //Force the value to the 0 - 1 scale
        if (pVal < 0) pVal = 0;
        else if (pVal > 1) pVal = 1;

        //Set the drag value
        this.__Internal__Dont__Modify__.drag = pVal;
    },

    /*
        PhysicsObject : angularDrag - Get's the angular drag of the Physics Object
        30/09/2016

        @return number - Returns a number representing the artificial angular drag
                         scale acting on the Physics Object rotational velocity

        Example:

        //Get the angular drag acting on the players physics object
        var angularDrag = playerPhysObj.angularDrag;
    */
    get angularDrag() {
        return this.__Internal__Dont__Modify__.angDrag;
    },

    /*
        PhysicsObject : angularDrag - Set the angular drag acting on the Physics Object
        30/09/2016

        @parma[in] pVal - A number representing the angular drag scale acting on the 
                          Physics Objects rotational velocity

        Example:

        //Remove all of the angular drag acting on the player
        playerPhysObj.angularDrag = 0;
    */
    set angularDrag(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set angular drag to " + pVal + " (Type '" + typeof pVal + "') Please use a number between 0 and 1");

        //Force the value to the 0 - 1 scale
        if (pVal < 0) pVal = 0;
        else if (pVal > 1) pVal = 1;

        //Set the drag value
        this.__Internal__Dont__Modify__.angDrag = pVal;
    },

    /*
        PhysicsObject : collider - Get's the Collider object in use by the Physics Object
        30/09/2016

        @return ColliderBase - Returns the Collider object in use by this Physics Object that
                               inherits ColliderBase

        Example:

        //Get the collider from the players physics object
        var collider = playerPhysObj.collider;
    */
    get collider() {
        return this.__Internal__Dont__Modify__.collider;
    },

    /*
        PhysicsObject : collider - Set the collider object in use by the Physics Object
        30/09/2016

        @param[in] pCol - A Collider object that inherits ColliderBase or null to remove

        Example:

        //Set the players physics object to use a box collider
        playerPhysObj.collider = new BoxCollider();
    */
    set collider(pCol) {
        //Check if the value is null
        if (pCol === null) {
            //Nullify the collider object
            this.__Internal__Dont__Modify__.collider = null;

            //Clear the global bounds object
            this.__Internal__Dont__Modify__.glbBounds = null;

            return;
        }

        //Check the passed in object inherits collider base
        if (!pCol instanceof ColliderBase)
            throw new Error("Can not set collider to " + pCol + " (Type '" + typeof pCol + "') Please use a object that inherits from ColliderBase");

        //Set the collider value
        this.__Internal__Dont__Modify__.collider = pCol;
    },
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                  Main Functions                                            ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
    PhysicsObject : addForce - Add a force to the PhysicsObject, either as a force
                               or as an impulse
    23/10/2016

    @param[in] pForce - A Vec2 object containing the force to apply
    @param[in] pMode - A value defined in the ForceMode object that dictates
                       how the force value will be treated (Default ForceMode.FORCE)

    Example:

    //Add an explosive force to the player 
    playerPhysObj.addForce(explosionPos.subtract(playerPhysObj.position).normalize().multi(EXPLOSIVE_FORCE), ForceMode.IMPULSE);
*/
PhysicsObject.prototype.addForce = function(pForce, pMode) {
    //Clean the mode flag
    if (typeof pMode === "undefined")
        pMode = ForceMode.FORCE;

    //Switch on the type of force application
    switch (pMode) {
        case ForceMode.FORCE:
            //Add the force to the acceleration
            this.__Internal__Dont__Modify__.acc.addSet(pForce.div(this.__Internal__Dont__Modify__.mass));
            break;
        case ForceMode.IMPULSE:
            //Add the force to the velocity
            this.__Internal__Dont__Modify__.vel.addSet(pForce);
            break;
        default:
            throw new Error("Can not apply force to Physics Object " + this + " with the mode " + pMode + " (Type '" + typeof pMode + "') Please use a value described in the ForceMode object");
    }
};

/*
    PhysicsObject : addTorque - Add a rotational force to the PhysicsObject, either as
                                a force or as an impulse
    23/10/2016

    @param[in] pTorque - A number defining the rotational force to apply 
    @param[in] pMode - A value defined in the ForceMode object that dictates
                       how the force value will be treated (Default ForceMode.FORCE)

    Example:

    //Add sudden rotational force to the player
    playerPhysObj.addTorque(FORCE_VALUE, ForceMode.IMPULSE);
*/
PhysicsObject.prototype.addTorque = function(pTorque, pMode) {
    //Clean the mode flag
    if (typeof pMode === "undefined")
        pMode = ForceMode.FORCE;

    //Switch on the type of force application
    switch (pMode) {
        case ForceMode.FORCE:
            //Add the force to the acceleration
            this.__Internal__Dont__Modify__.angAcc += pTorque;
            break;
        case ForceMode.IMPULSE:
            //Add the force to the velocity
            this.__Internal__Dont__Modify__.angVel += pTorque;
            break;
        default:
            throw new Error("Can not apply torque to Physics Object " + this + " with the mode " + pMode + " (Type '" + typeof pMode + "') Please use a value described in the ForceMode object");
    }
};

/*
    PhysicsObject : addTriggerEvent - Add a function to be called if something 
                                      triggers this Physics Object
    24/10/2016

    @param[in] pCb - A function to be called in the event of a trigger collision
                     Function takes in the Physics Object that raised the trigger
                     events

    Example:

    //Add a callback function on the bullet Physics Object to flag the player as dead
    bulletPhysObj.addtriggerEvent(function(pObj) {
        //Treat storage object as reference to the players Game Object
        if (pObj.storage.tag === "Player") {
            //TODO: Flag the player as dead
        }
    });
*/
PhysicsObject.prototype.addTriggerEvent = function(pCb) {
    //Check the value passed in is a function
    if (typeof pCb !== "function")
        throw new Error("Can not assign " + pCb + " (Type: '" + typeof pCb + "') as a trigger event function. Please use a function which takes in the Physics Object that triggered the event");

    //Add to the back of the trigger event list
    this.__Internal__Dont__Modify__.triggerEvents.push(pCb);
};

/*
    PhysicsObject : removeTriggerEvent - Remove a function from being called if 
                                         something triggers this Physics Object
    24/10/2016

    @param[in] pCb - A reference to the function that is to be removed from the
                     trigger event list

    @return bool - Returns true if the trigger event was removed succesfully

    Example:

    //Remove the trigger callback from the bullet
    bulletPhysObj.removeTriggerEvent(killPlayerEvent);
*/
PhysicsObject.prototype.removeTriggerEvent = function(pCb) {
    //Check the value passed in is a function
    if (typeof pCb !== "function")
        throw new Error("Can not remove " + pCb + " (Type: '" + typeof pCb + "') as a trigger event as it is not a function and should not be in the list.");

    //Loop through and find the function
    for (var i = this.__Internal__Dont__Modify__.triggerEvents.length - 1; i >= 0; i--) {
        if (this.__Internal__Dont__Modify__.triggerEvents[i] === pCb) {
            //Splice the event list at this point
            this.__Internal__Dont__Modify__.triggerEvents.splice(i, 1);

            //Leave the function
            return true;
        }
    }

    //Default return not found
    return false;
};

/*
    PhysicsObject : clearTriggerEvents - Clear all trigger events 
    24/10/2016

    Example:

    //Clear all trigger events associated with the bullet
    bulletPhysObj.clearTriggerEvents();
*/
PhysicsObject.prototype.clearTriggerEvents = function() {
    //Reset the event list
    this.__Internal__Dont__Modify__.triggerEvents = [];
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                Pipeline Functions                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
    PhysicsObject : update - Update the PhysicsObject, applying queued forces.
                             This is called by the Physics Manager.
    23/10/2016

    @param[in] pDelta - The delta time for the current physics cycle
    @param[in] pGravity - A Vec2 obejct defining the strength and direction of gravity
*/
PhysicsObject.prototype.update = function(pDelta, pGravity) {
    //Check if the Physics Object is effected by physics
    if (!this.__Internal__Dont__Modify__.kino) {
        //Apply the gravity force
        this.addForce(pGravity);

        //Apply the drag values
        this.__Internal__Dont__Modify__.acc.addSet(this.__Internal__Dont__Modify__.vel.negative.multiSet(this.__Internal__Dont__Modify__.drag));
        this.__Internal__Dont__Modify__.angAcc += -this.__Internal__Dont__Modify__.angVel * this.__Internal__Dont__Modify__.angDrag;

        //Add the force values
        this.__Internal__Dont__Modify__.vel.addSet(this.__Internal__Dont__Modify__.acc.multi(pDelta));
        this.__Internal__Dont__Modify__.angVel += this.__Internal__Dont__Modify__.angAcc * pDelta;

        //Modify the position and rotation values by velocity
        this.__Internal__Dont__Modify__.pos.addSet(this.__Internal__Dont__Modify__.vel.multi(pDelta));
        this.__Internal__Dont__Modify__.rot += this.__Internal__Dont__Modify__.angVel * pDelta;

        //Reset the acceleration values
        this.__Internal__Dont__Modify__.acc.reset();
        this.__Internal__Dont__Modify__.angAcc = 0;
    }

    //Update the bounds object
    this.__Internal__Dont__Modify__.glbBounds = (this.__Internal__Dont__Modify__.collider instanceof ColliderBase ?
        this.__Internal__Dont__Modify__.collider.__Internal__Dont__Modify__.bounds.getGlobalBounds(createTranslationMat(this.__Internal__Dont__Modify__.pos.x, this.__Internal__Dont__Modify__.pos.y)) :
        null);
};

/*
    PhysicsObject : collidesWith - Checks if this PhysicsObject intersects
                                   with another. This is called by the Physics
                                   Manager.
    21/10/2016

    @param[in] pOther - The other Physics Obejct that collision is being checked against

    @return CollisionData - Returns a CollisionData object containing collision 
                            information or null if no collision
*/
PhysicsObject.prototype.collidesWith = function(pOther) {
    //Check the objects colliders are valid
    if (this.collider === null || pOther.collider === null)
        return null;

    //Preform preliminary check for collision
    if (!this.__Internal__Dont__Modify__.glbBounds.isIntersecting(pOther.__Internal__Dont__Modify__.glbBounds))
        return null;

    //Store the return data
    var data = null;

    //Find the collision test to preform
    switch (this.collider.type | pOther.collider.type) {
        case ColliderType.BOX:
            //Get the half extent information
            var halfExtent1 = this.collider.extents.div(2);
            var halfExtent2 = pOther.collider.extents.div(2);

            //Check for collision
            if (!(this.position.x - halfExtent1.x >= pOther.position.x + halfExtent2.x ||
                    this.position.y - halfExtent1.y >= pOther.position.y + halfExtent2.y ||
                    pOther.position.x - halfExtent2.x >= this.position.x + halfExtent1.x ||
                    pOther.position.y - halfExtent2.y >= this.position.y + halfExtent1.y)) {

                //Get the seperation vector
                var seperation = pother.position.subtract(this.position);

                //Create the collision data object
                data = new CollisionData(this, pOther);

                //Store the overlap vector
                //TODO
            }

            //Get the seperation vector
            var seperation = pOther.position.subtract(this.position);
            break;
        case ColliderType.CIRCLE:
            //Store the minimum distance
            var min = this.collider.radius + pOther.collider.radius;

            //Get the seperation vector
            var seperation = pOther.position.subtract(this.position);

            //Store the distance the objects are apart
            var dist = seperation.mag;

            //Check for collision
            if (dist < min) {
                //Create the collision data object
                data = new CollisionData(this, pOther);

                //Store the overlap vector
                data.overlap = seperation.normalize().multiSet(min - dist);
            }
            break;
        case (ColliderType.BOX | ColliderType.CIRCLE):

            break;
        default:
            throw new Error("Can not test collision between the types " + this.collider.type + " and " + pOther.collider.type + ". Please check colliders are correct");
    }

    //Return the collision data
    return data;
};

/*
    PhysicsObject : raiseTriggerEvents - Raises all trigger events associated with the 
                                         Physics Object
    24/10/2016

    @param[in] pObj - A reference to the Physics Object which triggered the events to fire
*/
PhysicsObject.prototype.raiseTriggerEvents = function(pObj) {
    //Loop through all trigger events and raise them
    for (var i = this.__Internal__Dont__Modify__.triggerEvents.length - 1; i >= 0; i--)
        this.__Internal__Dont__Modify__.triggerEvents[i](pObj);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                               Collider Type Defines                                        ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: ColliderType
 *      Author: Mitchell Croft
 *      Date: 12/10/2016
 *
 *      Purpose:
 *      Provide a numerical value to the different type of 
 *      Collider objects that can be created
 */
var ColliderType = { NULL: -1, BOX: 1, CIRCLE: 2 };

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                 Object Definition                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: ColliderBase
 *      Author: Mitchell Croft
 *      Date: 03/10/2016
 *
 *      Version: 1.0
 *
 *      Requires:
 *      Vec2.js, Bounds.js
 *
 *      Purpose:
 *      Provide a base point for other collider types to inherit
 *      from and allow for type testing.
 **/

/*
    ColliderBase - Abstract Constructor - Initialise with default values
    03/10/2016
*/
function ColliderBase() {
    //Enfore abstract nature of the ColliderBase
    if (this.constructor === ColliderBase) throw new Error("Can not instantiate the abstract ColliderBase. Use a BoxCollider, CircleCollider or ShapeCollider");

    /*  WARNING:
        Don't modify this internal object from the outside of the Collider object.
        Instead use properties and functions to modify these values as this 
        allows for the internal information to update itself and keep it correct.
    */
    this.__Internal__Dont__Modify__ = {
        //Store the enabled flag of the collider
        enabled: true,

        //Store the offset from the center position in global space
        offset: new Vec2(),

        //Flags if this collider is a trigger or solid
        trigger: false,

        //Store the center of mass offset for the collider (Will remain at 0,0 unless collider is a shape collider)
        COMOffset: new Vec2(),

        //Store the axis aligned bounds of the collider for quick elimination
        bounds: new Bounds(),
    };
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                               Property Definitions                                         ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ColliderBase.prototype = {
    /*
        ColliderBase : type - Returns the type of collider the obejct is
        12/10/2016

        @return ColliderType - Returns a number defined in the ColliderType object

        Example:

        //Check if the collider is a square collider
        if (playerCollider.type !== ColliderType.NULL) {
            //TODO: Do something
        }
    */
    get type() {
        return ColliderType.NULL;
    },

    /*
        ColliderBase : enabled - Get's the enabled flag of the Collider object
        03/10/2016

        @return bool - Return's true if the Collider is enabled

        Example:

        //Check if the players collider is enabled
        if (playerCollider.enabled) {
            //Do something...
        }
    */
    get enabled() {
        return this.__Internal__Dont__Modify__.enabled;
    },

    /*
        ColliderBase : enabled - Set the enabled flag of the Collider object
        03/10/2016

        @param[in] pState - A bool value representing the new enabled state

        Example:

        //Disable the players collider
        playerCollider.enabled = false;
    */
    set enabled(pState) {
        //Check state is a bool
        if (typeof pState !== "boolean")
            throw new Error("Can not set Collider enabled to " + pState + " (Type '" + typeof pState + "') Please use a boolean value (True/False)");

        //Set the enabled state
        this.__Internal__Dont__Modify__.enabled = pState;
    },

    /*
        ColliderBase : offset - Get's the offset of the collider
        03/10/2016

        @return Vec2 - Returns a Vec2 object containing the offset values

        Example:

        //Get the player colliders offset
        var playColOffset = playerCollider.offset;
    */
    get offset() {
        return this.__Internal__Dont__Modify__.offset;
    },

    /*
        ColliderBase : offset - Set the offset of the collider from the Physics Objects center position
        03/10/2016

        @param[in] pOff - A Vec2 object containing the offset values

        Example:

        //Set the offset of the players collider
        playerCollider.offset = new Vec2(0, 0.5);
    */
    set offset(pOff) {
        //Test the offset value is a Vec2 object
        if (!pOff instanceof Vec2)
            throw new Error("Can not set collider offset to " + pOff + " (Type '" + typeof pOff + "') Please use a Vec2 object");

        //Set the offset values
        this.__Internal__Dont__Modify__.offset.set(pOff);
    },

    /*
        ColliderBase : isTrigger - Get's the trigger state for the collider
        03/10/2016

        @return bool - Returns true if the Collider object is a trigger

        Example:

        //Check if the player is a trigger
        if (playerCollider.isTrigger) {
            //Do something
        }
    */
    get isTrigger() {
        return this.__Internal__Dont__Modify__.trigger;
    },

    /*
        ColliderBase : isTrigger - Set's the trigger flag for the collider
        03/10/2016

        @param[in] pState - A bool value representing the trigger state of the collider

        Example:

        //Set the pickup collider as a trigger
        pickupCollider.isTrigger = true;
    */
    set isTrigger(pState) {
        //Check state is bool
        if (typeof pState !== "boolean")
            throw new Error("Can not set collider isTrigger to " + pState + " (Type '" + typeof pState + "') Please use a boolean value (True/False");

        //Set the trigger state
        this.__Internal__Dont__Modify__.trigger = pState;
    },
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                 Object Definition                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: BoxCollider
 *      Author: Mitchell Croft
 *      Date: 21/10/2016
 *
 *      Version: 1.0
 *
 *      Requires:
 *      ExtendProperties.js
 *
 *      Purpose:
 *      Define a square area that acts as the collision
 *      area of the collider
 **/

/*
    BoxCollider : Constructor - Initialise with default values
    21/10/2016

    Example:

    //Create a collider for the player
    playerPhysObj.collider = new BoxCollider();
*/
function BoxCollider() {
    //Call the Collider Base base for initial setup
    ColliderBase.call(this);

    //Store the extents of the collider
    this.__Internal__Dont__Modify__.extents = new Vec2(1);
};

//Apply the ColliderBase prototype
BoxCollider.prototype = Object.create(ColliderBase.prototype);
BoxCollider.prototype.constructor = BoxCollider;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                               Property Definitions                                         ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ExtendProperties(BoxCollider, {
    /*
        BoxCollider : type - Returns the type of collider the obejct is
        21/10/2016

        @return ColliderType - Returns a number defined in the ColliderType object

        Example:

        //Check if the collider is a square collider
        if (playerCollider.type === ColliderType.BOX) {
            //TODO: Do something
        }
    */
    get type() {
        return ColliderType.BOX;
    },

    /*
        BoxCollider : extents - Get the extents of the area covered by this collider
        21/10/2016

        @return Vec2 - Return the extents stored in a Vec2 object

        Example:

        //Get the extents of the players box collider
        var playerExtents = playerBoxCollider.extents;
    */
    get extents() {
        return this.__Internal__Dont__Modify__.extents;
    },

    /*
        BoxCollider : extents - Set the collider extents of the Box Collider
        21/10/2016

        @param[in] pExt - A Vec2 object storing the new extents of the collider (>= 0)

        Example:

        //Set the starting extents of the player's box collider
        playerBoxCollider = new Vec2(3, 4);
    */
    set extents(pExt) {
        //Check the value is a Vec2 object
        if (!pExt instanceof Vec2)
            throw new Error("Can not set the extents to " + pExt + " (Type '" + typeof pExt + "') Please use a Vec2 object");

        //Set the extents
        this.__Internal__Dont__Modify__.extents.set(pExt);

        //Ensure extents are >= 0
        this.__Internal__Dont__Modify__.extents.x = Math.max(this.__Internal__Dont__Modify__.extents.x, 0);
        this.__Internal__Dont__Modify__.extents.y = Math.max(this.__Internal__Dont__Modify__.extents.y, 0);

        //Update the bounds of the collider
        this.updateBounds();
    },

    /*
        BoxCollider : extentX - Get the X axis extent of the collider
        21/10/2016

        @return number - Returns the extent of the X axis as a number

        Example:

        //Get the X extent of the player
        var XExtent = playerBoxCollider.extentX;
    */
    get extentX() {
        return this.__Internal__Dont__Modify__.extents.x;
    },

    /*
        BoxCollider : extentX - Set the X axis extent of the collider
        21/10/2016

        @param[in] pVal - A number defining the new X extent length

        Example:

        //Set the players X extent length
        playerBoxCollider.extentX = 4;
    */
    set extentX(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set the X extent of the Box Collider to " + pVal + " (Type '" + typeof pVal + "') Please use a number");

        //Set the new extent value
        this.__Internal__Dont__Modify__.extents.x = Math.max(pVal, 0);

        //Update the bounds of the collider
        this.updateBounds();
    },

    /*
        BoxCollider : extentY - Get the Y axis extent of the collider
        21/10/2016

        @return number - Returns the extent of the Y axis as a number

        Example:

        //Get the Y extent of the player
        var YExtent = playerBoxCollider.extentY;
    */
    get extentY() {
        return this.__Internal__Dont__Modify__.extents.y;
    },

    /*
        BoxCollider : extentY - Set the Y axis extent of the collider
        21/10/2016

        @param[in] pVal 0 A number defining the new Y extent length

        Example:

        //Set the players Y extent length
        playerBoxCollider.extentY = 2;
    */
    set extentY(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set the Y extent of the Box Collider to " + pVal + " (Type '" + typeof pVal + "') Please use a number");

        //Set the new extent value
        this.__Internal__Dont__Modify__.extents.y = Math.max(pVal, 0);

        //Update the bounds of the collider
        this.updateBounds();
    },
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                  Main Functions                                            ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
    BoxCollider : updateBounds - Update the colliders bounds object
    21/10/2016
    
    Example:

    //Force the bounds of the collider to update
    playerBoxCollider.updateBounds();
*/
BoxCollider.prototype.updateBounds = function() {
    //Update the min/ max of the bounds based on the extents
    this.__Internal__Dont__Modify__.bounds.min = new Vec2(-this.__Internal__Dont__Modify__.extents.x / 2, -this.__Internal__Dont__Modify__.extents.y / 2);
    this.__Internal__Dont__Modify__.bounds.max = new Vec2(this.__Internal__Dont__Modify__.extents.x / 2, this.__Internal__Dont__Modify__.extents.y / 2);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                 Object Definition                                          ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
 *      Name: CircleCollider
 *      Author: Mitchell Croft
 *      Date: 21/10/2016
 *
 *      Version: 1.0
 *
 *      Requires:
 *      ExtendProperties.js
 *
 *      Purpose:
 *      Define a circle area that acts as the collision
 *      area of the collider
 **/

/*
    CircleCollider : Constructor - Initialise with default values
    21/10/2016

    Example:

    //Create a collider for the player
    playerPhysObj.collider = new CircleCollider();
*/
function CircleCollider() {
    //Call the Collider Base base for initial setup
    ColliderBase.call(this);

    //Store the radius of the collider
    this.__Internal__Dont__Modify__.radius = 1;
};

//Apply the ColliderBase prototype
CircleCollider.prototype = Object.create(ColliderBase.prototype);
CircleCollider.prototype.constructor = CircleCollider;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                               Property Definitions                                         ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ExtendProperties(CircleCollider, {
    /*
        CircleCollider : type - Returns the type of collider the obejct is
        21/10/2016

        @return ColliderType - Returns a number defined in the ColliderType object

        Example:

        //Check if the collider is a square collider
        if (playerCollider.type === ColliderType.CIRCLE) {
            //TODO: Do something
        }
    */
    get type() {
        return ColliderType.CIRCLE;
    },

    /*
        CircleCollider : radius - Get the radius of the Circle Collider
        21/10/2016

        @return number - Returns the radius as a number

        Example:

        //Get the radius of the players circle collider
        var radius = playerCircleCollider.radius;
    */
    get radius() {
        return this.__Internal__Dont__Modify__.radius;
    },

    /*
        CircleCollider : radius - Set the radius of the Circle Collider
        21/10/2016

        @param[in] pVal - Set the radius of the Circle Collider (>= 0)

        Example:

        //Set the players starting radius
        playerCircleCollider.radius = 10;
    */
    set radius(pVal) {
        //Check the value is a number
        if (typeof pVal !== "number")
            throw new Error("Can not set the radius of the Circle Collider to " + pVal + " (Type '" + typeof pVal + "') Please use a number");

        //Set the radius 
        this.__Internal__Dont__Modify__.radius = Math.max(pVal, 0);

        //Update the bounds of the collider
        this.updateBounds();
    },
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////                                                                                                            ////
/////                                                  Main Functions                                            ////
/////                                                                                                            ////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
    CircleCollider : updateBounds - Update the colliders bounds object
    21/10/2016

    Example:

    //Force the bounds of the collider to update
    playerCircleCollider.updateBounds();
*/
CircleCollider.prototype.updateBounds = function() {
    //Update the min/ max of the bounds based on the radius
    this.__Internal__Dont__Modify__.bounds.min = new Vec2(-this.__Internal__Dont__Modify__.radius);
    this.__Internal__Dont__Modify__.bounds.max = new Vec2(this.__Internal__Dont__Modify__.radius);
};