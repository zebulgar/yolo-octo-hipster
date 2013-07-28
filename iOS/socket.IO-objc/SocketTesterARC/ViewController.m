//
//  ViewController.m
//  SocketTesterARC
//
//  Created by Kyeck Philipp on 01.06.12.
//  Copyright (c) 2012 beta_interactive. All rights reserved.
//

#import "ViewController.h"

@interface ViewController ()

@property (unsafe_unretained, nonatomic) IBOutlet UICircularSlider *circularSlider;
@property (unsafe_unretained, nonatomic) IBOutlet UILabel *bpmlevel;

@end

@implementation ViewController

@synthesize circularSlider = _circularSlider;

- (void) viewDidLoad
{
    [super viewDidLoad];
    
    //[self.circularSlider addTarget:self action:@selector(updateProgress:) forControlEvents:UIControlEventValueChanged];

    // init graphView and set up options
    graphView = [[GraphView alloc]initWithFrame:CGRectMake(0, 0, self.view.frame.size.width, 300)];
    [graphView setBackgroundColor:[UIColor clearColor]];
    [graphView setSpacing:10];
    [graphView setFill:NO];
    [graphView setStrokeColor:[UIColor colorWithRed:((float)31 / 255.0f) green:((float)204 / 255.0f) blue:((float)113 / 255.0f) alpha:0.1]];
    [graphView setZeroLineStrokeColor:[UIColor clearColor]];
    [graphView setFillColor:[UIColor orangeColor]];
    [graphView setLineWidth:8];
    [graphView setCurvedLines:YES];
    [self.view addSubview:graphView];
    
    // setting up a border around the view. for this you need to: #import <QuartzCore/QuartzCore.h>
    //[graphView.layer setBorderColor:[UIColor redColor].CGColor];
    //[graphView.layer setBorderWidth:2];
    
    // button images
    
    // set up button for pre defined array
    
    
    curr = 0.0;
    timer = [NSTimer scheduledTimerWithTimeInterval:0.1 target:self selector:@selector(timer:) userInfo:nil repeats:YES];

    if (self.locationManager == nil) {
        self.locationManager = [[CLLocationManager alloc] init];
        self.locationManager.delegate = self;
        self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
        self.locationManager.distanceFilter = 10.f;
        [self.locationManager startUpdatingLocation];
    }

    
    
    // create socket.io client instance
    socketIO = [[SocketIO alloc] initWithDelegate:self];
    
    // you can update the resource name of the handshake URL
    // see https://github.com/pkyeck/socket.IO-objc/pull/80
    // [socketIO setResourceName:@"whatever"];
    
    // if you want to use https instead of http
    // socketIO.useSecure = YES;
    
    // connect to the socket.io server that is running locally at port 3000
    [socketIO connectToHost:@"172.16.240.179" onPort:3000];
    
//    SocketIOCallback cb = ^(id argsData) {
//        NSDictionary *response = argsData;
//    };

    self.motionManager = [[CMMotionManager alloc] init];
    self.motionManager.accelerometerUpdateInterval = .2;
    self.motionManager.gyroUpdateInterval = .2;
    UIApplication *app = [UIApplication sharedApplication];
    bgTask = [app beginBackgroundTaskWithExpirationHandler:^{
        bgTask = UIBackgroundTaskInvalid;
    }];

    [self.motionManager startAccelerometerUpdatesToQueue:[NSOperationQueue currentQueue]
                                             withHandler:^(CMAccelerometerData *accelerometerData, NSError *error) {
                                                 NSTimeInterval remaining = [[UIApplication sharedApplication] backgroundTimeRemaining];
                                                 if (remaining < 600) {
                                                     NSLog(@"time remaining: %f",remaining);
                                                     [self.locationManager stopUpdatingLocation];
                                                     [self.locationManager startUpdatingLocation];
                                                 }

                                                 [self outputAccelertionData:accelerometerData.acceleration];
                                                 if(error){
                                                     
                                                     NSLog(@"%@", error);
                                                 }
                                             }];
    
//    [self.motionManager startGyroUpdatesToQueue:[NSOperationQueue currentQueue]
//                                    withHandler:^(CMGyroData *gyroData, NSError *error) {
//                                        NSTimeInterval remaining = [[UIApplication sharedApplication] backgroundTimeRemaining];
//                                        if (remaining < 600) {
//                                            NSLog(@"time remaining: %f",remaining);
//                                            [self.locationManager stopUpdatingLocation];
//                                            [self.locationManager startUpdatingLocation];
//                                        }
//
//                                        [self outputRotationData:gyroData.rotationRate];
//                                    }];
    
    [app endBackgroundTask:bgTask];

}

-(void)timer:(NSTimer *)timer
{
    _bpmlevel.text = [NSString stringWithFormat:@"%2d", (int)([bpm floatValue])];

    [self setPointButtonAction];
    NSLog(@"Test");
}


- (IBAction)updateProgress:(UISlider *)sender {
//    [timer invalidate];
//    timer = [NSTimer scheduledTimerWithTimeInterval:((1 - self.circularSlider.value) / 20) target:self selector:@selector(timer:) userInfo:nil repeats:YES];

	float progress = translateValueFromSourceIntervalToDestinationInterval(sender.value, sender.minimumValue, sender.maximumValue, 0.0, 1.0);
	[self.circularSlider setValue:sender.value];
    _bpmlevel.text = [NSString stringWithFormat:@"%2d", (int)([bpm floatValue])];
    NSLog(@"Update center label with bpm");
}


-(void)setArrayButtonAction {
    
    // set up array for diplay in graphView
    NSArray *points = @[@0.0f,
                        @0.0f,
                        @0.0f,
                        @13.0f,
                        @7.0f,
                        @9.0f,
                        @20.0f,
                        @04,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @0.0f,
                        @1.0f,
                        @2.0f,
                        @3.0f,
                        @4.0f,
                        @5.0f,
                        @6.0f,
                        @7.0f,
                        @8.0f,
                        @9.0f,
                        @10.0f,
                        @11.0f,
                        @12.0f,
                        @13.0f,
                        @14.0f,
                        @13.0f,
                        @12.0f,
                        @11.0f,
                        @10.0f,
                        @9.0f,
                        @8.0f,
                        @7.0f,
                        @6.0f,
                        @5.0f,
                        @4.0f,
                        @3.0f,
                        @2.0f,
                        @1.0f];
    
    [graphView setArray:points];
}

-(void)setPointButtonAction {
    // generate random numbers between +100 and -100
    float low_bound = -100.00;
    float high_bound = 100.00;
    //float rndValue = (((float)arc4random()/0x100000000)*(high_bound-low_bound)+low_bound);
    
    //    if (curr > high_bound) {
    //        dir = dir * -1;
    //        curr = high_bound;
    //    }
    //    
    //    if (curr < low_bound) {
    //        dir = dir * -1;
    //        curr = low_bound;
    //    }
    
    NSLog(@"Curr is %f", curr);
    
        curr = curr + 0.2;
    
    //int intRndValue = (int)(rndValue + 0.5);
    
    [graphView setPoint:sin(curr) * 10];
    
    if ([bpm floatValue] < 10.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.1) target:self selector:@selector(timer:) userInfo:nil repeats:YES];

    }
    else if ([bpm floatValue] < 20.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.05) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
        
    }
    else if ([bpm floatValue] < 30.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.03) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
        
    }
    else if ([bpm floatValue] < 50.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.01) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
        
    }
    else if ([bpm floatValue] < 70.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.005) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
        
    }
    else if ([bpm floatValue] < 90.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.001) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
        
    }
    else if ([bpm floatValue] < 100.0) {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.00005) target:self selector:@selector(timer:) userInfo:nil repeats:YES];

    }
    
    else {
        [timer invalidate];
        timer = [NSTimer scheduledTimerWithTimeInterval:(0.00001) target:self selector:@selector(timer:) userInfo:nil repeats:YES];

    }
}

-(void)outputAccelertionData:(CMAcceleration)acceleration
{
    //socketIO = [[SocketIO alloc] initWithDelegate:self];
    
    // you can update the resource name of the handshake URL
    // see https://github.com/pkyeck/socket.IO-objc/pull/80
    // [socketIO setResourceName:@"whatever"];
    
    // if you want to use https instead of http
    // socketIO.useSecure = YES;
    
    // connect to the socket.io server that is running locally at port 3000
    //[socketIO connectToHost:@"172.16.240.165" onPort:3000];

    acc = acceleration.y;
    
    NSMutableDictionary *dict = [NSMutableDictionary dictionary];
    [dict setObject:[NSString stringWithFormat:@" %.2f",acceleration.x] forKey:@"x"];
    [dict setObject:[NSString stringWithFormat:@" %.2f",acceleration.y] forKey:@"y"];
    [dict setObject:[NSString stringWithFormat:@" %.2f",acceleration.z] forKey:@"z"];
    [dict setObject:[NSString stringWithFormat:@"%@",idnumber] forKey:@"id"];

    [socketIO sendEvent:@"accelerometer" withData:dict];

//    if (([bpm length] > 0) && ([bpm floatValue] > 5.0)) {
//        NSLog(@"Loop a");
//        [timer invalidate];
//        timer = [NSTimer scheduledTimerWithTimeInterval:([bpm floatValue] / 20) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
//    }
//    else {
//        NSLog(@"Loop b7,");
//
//        [timer invalidate];
//        timer = [NSTimer scheduledTimerWithTimeInterval:(0.2) target:self selector:@selector(timer:) userInfo:nil repeats:YES];
//    }
    
}

- (void) socketIO:(SocketIO *)socket didSendMessage:(SocketIOPacket *)packet
{
    NSLog(@"Received this data: %@", packet.data);
}

//- (void) socketIO:(SocketIO *)socket didSendMessage:(SocketIOPacket *)packet {
//    NSLog(@"Received response: %@", packet);
//    
//}

//-(void)outputRotationData:(CMRotationRate)rotation
//{
//    
//    socketIO = [[SocketIO alloc] initWithDelegate:self];
//    
//    // you can update the resource name of the handshake URL
//    // see https://github.com/pkyeck/socket.IO-objc/pull/80
//    // [socketIO setResourceName:@"whatever"];
//    
//    // if you want to use https instead of http
//    // socketIO.useSecure = YES;
//    
//    // connect to the socket.io server that is running locally at port 3000
//    [socketIO connectToHost:@"172.16.240.165" onPort:3000];
//    NSMutableDictionary *dict = [NSMutableDictionary dictionary];
//    [dict setObject:[NSString stringWithFormat:@" %.2fg",rotation.x] forKey:@"x"];
//    [dict setObject:[NSString stringWithFormat:@" %.2fg",rotation.y] forKey:@"y"];
//    [dict setObject:[NSString stringWithFormat:@" %.2fg",rotation.z] forKey:@"z"];
//    
//    
//    [socketIO sendEvent:@"request" withData:dict];
//    
//}


# pragma mark -
# pragma mark socket.IO-objc delegate methods

- (void) socketIODidConnect:(SocketIO *)socket
{
    NSLog(@"socket.io connected.");
}

- (void) socketIO:(SocketIO *)socket didReceiveEvent:(SocketIOPacket *)packet
{
    NSLog(@"didReceiveEvent()");
    
    SocketIOCallback cb = ^(id argsData) {
        NSDictionary *response = argsData;
        // do something with response
        NSLog(@"ack arrived: %@", response);
        // test forced disconnect
        //[socketIO disconnectForced];
    };
    [socketIO sendMessage:@"accelerometer" withAcknowledge:cb];
}

- (void) socketIO:(SocketIO *)socket onError:(NSError *)error
{
    NSLog(@"onError() %@", error);
}



- (void) socketIODidDisconnect:(SocketIO *)socket disconnectedWithError:(NSError *)error
{
    NSLog(@"socket.io disconnected. did error occur? %@", error);
}

# pragma mark -

- (void) viewDidUnload
{
    [super viewDidUnload];
}

//- (id)initWithFrame:(CGRect)frame {
//    self = [super initWithFrame:frame];
//    return self;
//}

- (void)drawRect:(CGRect)rect {
    CGContextRef context = UIGraphicsGetCurrentContext();
    CGContextSetLineWidth(context, 2.0);
    CGContextSetStrokeColorWithColor(context, [UIColor blueColor].CGColor);
    CGContextBeginPath(context);
    CGContextMoveToPoint(context, 100, 100);
    CGContextAddCurveToPoint(context,125,150,175,150,200,100);
    CGContextAddCurveToPoint(context,225,50,275,75,300,200);
    CGContextStrokePath(context);
}


- (BOOL) shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation
{
    return (interfaceOrientation != UIInterfaceOrientationPortraitUpsideDown);
}

-(IBAction)sendmessagetoserver:(id)sender {
    socketIO = [[SocketIO alloc] initWithDelegate:self];
    
    // you can update the resource name of the handshake URL
    // see https://github.com/pkyeck/socket.IO-objc/pull/80
    // [socketIO setResourceName:@"whatever"];
    
    // if you want to use https instead of http
    // socketIO.useSecure = YES;
    
    // connect to the socket.io server that is running locally at port 3000
    [socketIO connectToHost:@"172.16.240.179" onPort:3000];
    NSMutableDictionary *dict = [NSMutableDictionary dictionary];
    [dict setObject:@"test1" forKey:@"key1"];
    [dict setObject:@"test2" forKey:@"key2"];
    
    [socketIO sendEvent:@"request" withData:dict];
}



@end
