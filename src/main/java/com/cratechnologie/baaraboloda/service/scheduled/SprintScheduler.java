package com.cratechnologie.baaraboloda.service.scheduled;

import com.cratechnologie.baaraboloda.service.SprintService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SprintScheduler {

    private static final Logger LOG = LoggerFactory.getLogger(SprintScheduler.class);

    private final SprintService sprintService;

    public SprintScheduler(SprintService sprintService) {
        this.sprintService = sprintService;
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Africa/Abidjan")
    public void completeExpiredSprints() {
        try {
            int count = sprintService.completeExpiredSprints();
            if (count > 0) {
                LOG.info("Scheduled task closed {} expired sprint(s)", count);
            }
        } catch (Exception e) {
            LOG.error("Failed to auto-complete expired sprints", e);
        }
    }
}
