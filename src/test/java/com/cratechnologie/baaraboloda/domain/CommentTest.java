package com.cratechnologie.baaraboloda.domain;

import static com.cratechnologie.baaraboloda.domain.CommentTestSamples.*;
import static com.cratechnologie.baaraboloda.domain.TaskTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.cratechnologie.baaraboloda.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class CommentTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(Comment.class);
        Comment comment1 = getCommentSample1();
        Comment comment2 = new Comment();
        assertThat(comment1).isNotEqualTo(comment2);

        comment2.setId(comment1.getId());
        assertThat(comment1).isEqualTo(comment2);

        comment2 = getCommentSample2();
        assertThat(comment1).isNotEqualTo(comment2);
    }

    @Test
    void taskTest() {
        Comment comment = getCommentRandomSampleGenerator();
        Task taskBack = getTaskRandomSampleGenerator();

        comment.setTask(taskBack);
        assertThat(comment.getTask()).isEqualTo(taskBack);

        comment.task(null);
        assertThat(comment.getTask()).isNull();
    }
}
