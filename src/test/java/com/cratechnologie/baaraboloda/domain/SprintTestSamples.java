package com.cratechnologie.baaraboloda.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

public class SprintTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + 2L * Integer.MAX_VALUE);

    public static Sprint getSprintSample1() {
        return new Sprint().id(1L).name("name1").goal("goal1");
    }

    public static Sprint getSprintSample2() {
        return new Sprint().id(2L).name("name2").goal("goal2");
    }

    public static Sprint getSprintRandomSampleGenerator() {
        return new Sprint().id(longCount.incrementAndGet()).name(UUID.randomUUID().toString()).goal(UUID.randomUUID().toString());
    }
}
