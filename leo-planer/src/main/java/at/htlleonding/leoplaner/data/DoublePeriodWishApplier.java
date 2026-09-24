package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import at.htlleonding.leoplaner.data.TeacherWishProfile.DoublePeriodMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;

/**
 * Turns the DOUBLE_PERIOD wishes into flags on ClassSubject, where the split of
 * the weekly hours into single and double periods reads them. The annealer
 * never changes a lesson's duration, so pricing these wishes there alone could
 * only ever report them, never act on them.
 *
 * Only ever sets flags, never clears them: a flag set by hand looks exactly
 * like one set here, so a removed wish has to be undone by a human.
 */
public final class DoublePeriodWishApplier {

    private DoublePeriodWishApplier() {
    }

    /**
     * Call inside a transaction, the flags are set on managed entities.
     * Returns every wish that could not be applied and why.
     */
    public static List<String> apply(final List<TeacherWishProfile> profiles,
            final List<ClassSubject> classSubjects) {
        final List<String> problems = new ArrayList<>();
        // keyed by identity on purpose, the entities carry no equals() and all
        // come from the same list
        final Map<ClassSubject, Set<DoublePeriodMode>> wanted = new LinkedHashMap<>();

        for (final TeacherWishProfile profile : profiles) {
            for (final TeacherWish wish : profile.wishes()) {
                if (wish.type() != WishType.DOUBLE_PERIOD || !wish.problems().isEmpty()) {
                    continue;
                }

                boolean matched = false;
                for (final ClassSubject cs : classSubjects) {
                    if (teaches(cs, profile.nameSymbol()) && isClass(cs, wish.className())) {
                        wanted.computeIfAbsent(cs, c -> EnumSet.noneOf(DoublePeriodMode.class))
                                .add(wish.doublePeriodMode());
                        matched = true;
                    }
                }
                if (!matched) {
                    problems.add(profile.teacherId() + " DOUBLE_PERIOD: teaches nothing in " + wish.className());
                }
            }
        }

        for (final Map.Entry<ClassSubject, Set<DoublePeriodMode>> entry : wanted.entrySet()) {
            final ClassSubject cs = entry.getKey();
            final Set<DoublePeriodMode> modes = entry.getValue();

            if (modes.size() > 1) {
                problems.add(describe(cs) + ": teachers disagree, left unchanged");
            } else if (modes.contains(DoublePeriodMode.PREFER)) {
                cs.setBetterDoublePeriod(true);
            } else if (cs.isRequiresDoublePeriod()) {
                problems.add(describe(cs) + ": AVOID ignored, subject requires double periods");
            } else if (cs.isBetterDoublePeriod()) {
                problems.add(describe(cs) + ": AVOID not applied, subject is flagged better as double period");
            } else {
                cs.setAvoidDoublePeriod(true);
            }
        }

        return problems;
    }

    private static boolean teaches(final ClassSubject cs, final String nameSymbol) {
        return cs.getTeachers() != null && cs.getTeachers().stream()
                .anyMatch(t -> t != null && nameSymbol.equals(t.getNameSymbol()));
    }

    private static boolean isClass(final ClassSubject cs, final String className) {
        return cs.getSchoolClass() != null && className.equalsIgnoreCase(cs.getSchoolClass().getClassName());
    }

    private static String describe(final ClassSubject cs) {
        final String className = cs.getSchoolClass() == null ? "?" : cs.getSchoolClass().getClassName();
        final String subject = cs.getSubject() == null ? "?" : cs.getSubject().getSubjectName();
        return className + " " + subject;
    }
}
