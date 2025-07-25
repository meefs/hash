import { useMutation, useQuery } from "@apollo/client";
import type { EntityId } from "@blockprotocol/type-system";
import { ArrowUpRightRegularIcon } from "@hashintel/design-system";
import { Grid, styled } from "@mui/material";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";

import { useUpdateAuthenticatedUser } from "../components/hooks/use-update-authenticated-user";
import type {
  AcceptOrgInvitationMutation,
  AcceptOrgInvitationMutationVariables,
  GetPendingInvitationByEntityIdQuery,
  GetPendingInvitationByEntityIdQueryVariables,
} from "../graphql/api-types.gen";
import {
  acceptOrgInvitationMutation,
  getPendingInvitationByEntityIdQuery,
} from "../graphql/queries/knowledge/org.queries";
import type { NextPageWithLayout } from "../shared/layout";
import { getPlainLayout } from "../shared/layout";
import type { ButtonProps } from "../shared/ui";
import { Button } from "../shared/ui";
import { useAuthInfo } from "./shared/auth-info-context";
import { AuthLayout } from "./shared/auth-layout";
import { parseGraphQLError } from "./shared/auth-utils";
import { AcceptOrgInvitation } from "./signup.page/accept-org-invitation";
import type { AccountSetupFormData } from "./signup.page/account-setup-form";
import { AccountSetupForm } from "./signup.page/account-setup-form";
import { SignupRegistrationForm } from "./signup.page/signup-registration-form";
import { SignupRegistrationRightInfo } from "./signup.page/signup-registration-right-info";
import { SignupSteps } from "./signup.page/signup-steps";

const LoginButton = styled((props: ButtonProps) => (
  <Button variant="secondary" size="small" {...props} />
))(({ theme }) => ({
  color: theme.palette.gray[90],
  background: theme.palette.blue[10],
  transition: theme.transitions.create(["background", "box-shadow"]),
  borderColor: theme.palette.common.white,
  boxShadow: theme.shadows[3],
  "&:hover": {
    background: theme.palette.common.white,
    boxShadow: theme.shadows[4],
    "&:before": {
      opacity: 0,
    },
  },
}));

const containerWidth = "1200px";

const containerLeftMargin = `((100vw - ${containerWidth}) / 2)`;

const containerPaddingX = "24px";

const containerLeftContentWidth = `((${containerWidth} - ${containerPaddingX}) * (7 / 12))`;

const distanceFromLeft = `calc(
  ${containerLeftMargin}
  + ${containerPaddingX}
  + ${containerLeftContentWidth}
)`;

const SignupPage: NextPageWithLayout = () => {
  const router = useRouter();

  const { authenticatedUser, refetch: refetchAuthenticatedUser } =
    useAuthInfo();

  const { invitationId } = router.query;

  const [showInvitationStep, setShowInvitationStep] = useState(true);

  const { data: invitationData, loading: invitationLoading } = useQuery<
    GetPendingInvitationByEntityIdQuery,
    GetPendingInvitationByEntityIdQueryVariables
  >(getPendingInvitationByEntityIdQuery, {
    onCompleted: (data) => {
      if (data.getPendingInvitationByEntityId && !authenticatedUser) {
        setShowInvitationStep(true);
      } else {
        setShowInvitationStep(false);
      }
    },
    variables: {
      entityId: invitationId as EntityId,
    },
    skip: !invitationId,
  });

  const [acceptInvitation] = useMutation<
    AcceptOrgInvitationMutation,
    AcceptOrgInvitationMutationVariables
  >(acceptOrgInvitationMutation);

  const invitation = invitationData?.getPendingInvitationByEntityId;

  const [updateAuthenticatedUser, { loading: updateUserLoading }] =
    useUpdateAuthenticatedUser();

  const [errorMessage, setErrorMessage] = useState<string>();

  const handleAccountSetupSubmit = useCallback(
    async (params: AccountSetupFormData) => {
      const { shortname, displayName } = params;

      const { errors } = await updateAuthenticatedUser({
        shortname,
        displayName,
      });

      if (errors && errors.length > 0) {
        const { message } = parseGraphQLError([...errors]);
        setErrorMessage(message);
      }

      if (invitation) {
        await acceptInvitation({
          variables: {
            orgInvitationEntityId: invitation.invitationEntityId,
          },
        });
      }

      await refetchAuthenticatedUser();

      void router.push("/");
    },
    [
      acceptInvitation,
      invitation,
      refetchAuthenticatedUser,
      updateAuthenticatedUser,
      router,
    ],
  );

  /** @todo: un-comment this to actually check whether the email is verified */
  // const userHasVerifiedEmail =
  //   authenticatedUser?.emails.find(({ verified }) => verified) !== undefined;
  const userHasVerifiedEmail = true;

  return (
    <AuthLayout
      sx={{
        background: ({ palette }) => ({
          xs: undefined,
          md: `linear-gradient(
            to right,
            ${palette.gray[10]} 0%,
            ${palette.gray[10]} ${distanceFromLeft},
            ${palette.gray[20]} ${distanceFromLeft},
            ${palette.gray[20]} 100%)`,
        }),
      }}
      headerEndAdornment={
        authenticatedUser ? null : (
          <LoginButton href="/signin" endIcon={<ArrowUpRightRegularIcon />}>
            Sign In
          </LoginButton>
        )
      }
    >
      <Grid container columnSpacing={16}>
        <Grid item xs={12} md={7}>
          {invitationLoading ? null : invitation && showInvitationStep ? (
            <AcceptOrgInvitation
              invitation={invitation}
              onAccept={() => setShowInvitationStep(false)}
            />
          ) : authenticatedUser ? (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- @todo improve logic or types to remove this comment
            userHasVerifiedEmail ? (
              <AccountSetupForm
                onSubmit={handleAccountSetupSubmit}
                loading={updateUserLoading}
                errorMessage={errorMessage}
              />
            ) : /** @todo: add verification form */
            null
          ) : (
            <SignupRegistrationForm />
          )}
        </Grid>
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            display: "flex",
            alignItems: "center",
            paddingY: {
              xs: 6,
              md: 0,
            },
          }}
        >
          {authenticatedUser || invitation ? (
            <SignupSteps
              currentStep={
                invitation && !authenticatedUser
                  ? "accept-invitation"
                  : "reserve-username"
              }
              withInvitation={!!invitation}
            />
          ) : (
            <SignupRegistrationRightInfo />
          )}
        </Grid>
      </Grid>
    </AuthLayout>
  );
};

SignupPage.getLayout = getPlainLayout;

export default SignupPage;
