//
//  ViewController.m
//  SocketTesterARC
//
//  Created by Kyeck Philipp on 01.06.12.
//  Copyright (c) 2012 beta_interactive. All rights reserved.
//

#import "ViewController.h"

@interface ViewController ()

@end

@implementation ViewController

- (void) viewDidLoad
{
    [super viewDidLoad];
    
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
    
    SocketIOCallback cb = ^(id argsData) {
        NSDictionary *response = argsData;
    };

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

-(void)outputAccelertionData:(CMAcceleration)acceleration
{
    socketIO = [[SocketIO alloc] initWithDelegate:self];
    
    // you can update the resource name of the handshake URL
    // see https://github.com/pkyeck/socket.IO-objc/pull/80
    // [socketIO setResourceName:@"whatever"];
    
    // if you want to use https instead of http
    // socketIO.useSecure = YES;
    
    // connect to the socket.io server that is running locally at port 3000
    [socketIO connectToHost:@"172.16.240.179" onPort:3000];
    NSLog(@"delian sucks2");

    NSMutableDictionary *dict = [NSMutableDictionary dictionary];
    [dict setObject:[NSString stringWithFormat:@" %.2f",acceleration.x] forKey:@"x"];
    [dict setObject:[NSString stringWithFormat:@" %.2f",acceleration.y] forKey:@"y"];
    [dict setObject:[NSString stringWithFormat:@" %.2f",acceleration.z] forKey:@"z"];
    [dict setObject:[NSString stringWithFormat:@"%@",idnumber] forKey:@"id"];

    SocketIOCallback cb = ^(id argsData) {
        NSDictionary *response = argsData;
        NSLog(@"delian sucks");
        NSLog(@"Maybe here is the response %@", response);
    };
    [socketIO sendEvent:@"accelerometer" withData:dict andAcknowledge:cb];

    
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
