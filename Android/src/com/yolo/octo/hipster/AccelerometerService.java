package com.yolo.octo.hipster;

import android.app.Service;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.IBinder;
import android.util.Log;

import java.io.FileInputStream;
import java.io.IOException;

public class AccelerometerService extends Service implements SensorEventListener{
    private SensorManager sensorManager;
    private long lastUpdate;
    private boolean moving = false;
    private static final String TAG = "Nightingale";
    private String regId;
    long lastPickedUp = 0;

    @Override
    public void onCreate() {
        Log.v(TAG, "AccelerometerService created");

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        sensorManager.registerListener((SensorEventListener) this,sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER),
                SensorManager.SENSOR_DELAY_NORMAL);
    }

    @Override
    public void onDestroy() {
        Log.v(TAG, "AccelerometerService destroyed");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float[] values = event.values;
            // Movement
            float x = values[0];
            float y = values[1];
            float z = values[2];

        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

}