package com.yolo.octo.hipster;

import android.app.Activity;
import android.content.Intent;
import android.hardware.SensorEventListener;
import android.os.Bundle;
import android.hardware.SensorEvent;
import android.hardware.SensorManager;
import android.hardware.Sensor;
import android.util.Log;

public class MainActivity extends Activity {

    public MainActivity() {;
    }

    @Override
    protected void onStart() {
        super.onStart();
    }

    protected void onResume() {
        super.onResume();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent startServiceIntent = new Intent(this, AccelerometerService.class);
        this.startService(startServiceIntent);
    }

    protected void onPause() {
        super.onPause();
    }
}