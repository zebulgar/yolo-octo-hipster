package com.yolo.octo.hipster;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.hardware.SensorEventListener;
import android.os.Bundle;
import android.hardware.SensorEvent;
import android.hardware.SensorManager;
import android.hardware.Sensor;
import android.os.PowerManager;
import android.util.Log;

public class MainActivity extends Activity {
    PowerManager.WakeLock wakeLock;

    public MainActivity() {;
    }

    @Override
    protected void onStart() {
        super.onStart();
    }

    protected void onResume() {
        super.onResume();
        PowerManager mgr = (PowerManager)this.getSystemService(Context.POWER_SERVICE);
        wakeLock = mgr.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SuperDerp");
        wakeLock.acquire();
        Intent startServiceIntent = new Intent(this, AccelerometerService.class);
        this.startService(startServiceIntent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        PowerManager mgr = (PowerManager)this.getSystemService(Context.POWER_SERVICE);
        wakeLock = mgr.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SuperDerp");
        wakeLock.acquire();
        Intent startServiceIntent = new Intent(this, AccelerometerService.class);
        this.startService(startServiceIntent);
    }

    @Override
    protected void onDestroy() {
        wakeLock.release();
        super.onDestroy();
    }

    protected void onPause() {
        super.onPause();
    }
}