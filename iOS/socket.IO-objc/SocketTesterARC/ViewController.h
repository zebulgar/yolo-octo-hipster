//
//  ViewController.h
//  SocketTesterARC
//
//  Created by Kyeck Philipp on 01.06.12.
//  Copyright (c) 2012 beta_interactive. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "SocketIO.h"
#import "SocketIOPacket.h"
#import <CoreMotion/CoreMotion.h>
#import <CoreLocation/CoreLocation.h>
#import "AppDelegate.h"
#import "GraphView.h"
#import "UICircularSlider.h"

UIBackgroundTaskIdentifier bgTask;

@interface ViewController : UIViewController <SocketIODelegate>
{
    SocketIO *socketIO;
    GraphView *graphView;
    float curr;
    float acc;

}


@property (strong, nonatomic) CMMotionManager *motionManager;
@property (strong, nonatomic) CLLocationManager *locationManager;
@property (strong, nonatomic) NSOperationQueue *accelQueue;


@end
