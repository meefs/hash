import { TextField } from "@hashintel/design-system";
import { frontendUrl } from "@local/hash-isomorphic-utils/environment";
import type { BoxProps } from "@mui/material";
import {
  Box,
  InputAdornment,
  inputAdornmentClasses,
  Typography,
  typographyClasses,
} from "@mui/material";
import type { FunctionComponent, ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import { useShortnameInput } from "../../components/hooks/use-shortname-input";
import { ChevronRightRegularIcon } from "../../shared/icons/chevron-right-regular-icon";
import { CircleRegularInfoIcon } from "../../shared/icons/circle-info-regular-icon";
import { TriangleExclamationRegularIcon } from "../../shared/icons/triangle-exclamation-regular-icon";
import { Button, Link } from "../../shared/ui";

const inputWidth = 250;

const InputLabel: FunctionComponent<
  {
    label: ReactNode;
    description: ReactNode;
  } & BoxProps<"label">
> = ({ label, description, sx, ...labelProps }) => {
  return (
    <Box
      component="label"
      {...labelProps}
      sx={[
        {
          display: "block",
          marginBottom: 1.5,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        sx={{
          color: ({ palette }) => palette.common.black,
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color: "rgba(0, 0, 0, 0.66)",
          fontSize: 13,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
};

type AccountSetupFormProps = {
  onSubmit: (details: { shortname: string; displayName: string }) => void;
  loading: boolean;
  errorMessage?: string;
};

export type AccountSetupFormData = {
  shortname: string;
  displayName: string;
};

export const AccountSetupForm: FunctionComponent<AccountSetupFormProps> = ({
  onSubmit: setupAccount,
  loading,
  errorMessage,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isValid, touchedFields },
  } = useForm<AccountSetupFormData>({
    mode: "all",
    defaultValues: {
      shortname: "",
      displayName: "",
    },
  });

  const shortnameWatcher = watch("shortname", "");
  const displayNameWatcher = watch("displayName", "");

  const { validateShortname, parseShortnameInput, getShortnameError } =
    useShortnameInput();

  const onSubmit = handleSubmit(({ shortname, displayName }) => {
    setupAccount({
      shortname,
      displayName,
    });
  });

  const shortnameError = getShortnameError(
    errors.shortname?.message,
    Boolean(touchedFields.shortname),
  );

  return (
    <Box>
      <Typography
        sx={{
          color: ({ palette }) => palette.common.black,
          fontWeight: 700,
          fontSize: 32,
        }}
      >
        Thanks for confirming your account
      </Typography>
      <Typography
        sx={{
          color: ({ palette }) => palette.common.black,
          fontSize: 24,
        }}
      >
        Now it’s time to set your name...
      </Typography>
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{
          marginTop: 6,
          display: "flex",
          flexDirection: "column",
          rowGap: 4,
        }}
      >
        <Box>
          <InputLabel
            htmlFor="name"
            label="Display Name"
            description={
              <>
                How should others see you on HASH? e.g. “
                <Box
                  component="strong"
                  sx={{
                    color: ({ palette }) => palette.common.black,
                    opacity: 1,
                    textTransform: "capitalize",
                  }}
                >
                  {displayNameWatcher || "Jonathan Smith"}
                </Box>
                ”
              </>
            }
          />
          <TextField
            id="name"
            placeholder="Jonathan Smith"
            autoFocus
            sx={{ width: inputWidth }}
            {...register("displayName", { required: true })}
          />
        </Box>
        <Box>
          <InputLabel
            htmlFor="shortname"
            label={
              <>
                Personal Username{" "}
                <Box
                  component="span"
                  sx={{
                    marginLeft: 2,
                    color: ({ palette }) => palette.blue[70],
                  }}
                >
                  Once set this Cannot be changed{" "}
                  <TriangleExclamationRegularIcon
                    sx={{ fontSize: 13, position: "relative", top: 1 }}
                  />
                </Box>
              </>
            }
            description={
              <>
                Your own personal graph will exist under this username. e.g.{" "}
                {frontendUrl}/
                <Box
                  component="strong"
                  sx={{
                    color: ({ palette }) => palette.common.black,
                    fontWeight: 700,
                  }}
                >
                  @{shortnameWatcher || "example"}
                </Box>
              </>
            }
          />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Controller
              control={control}
              name="shortname"
              rules={{ validate: validateShortname }}
              render={({ field }) => (
                <TextField
                  id="shortname"
                  {...field}
                  onChange={(evt) => {
                    const newEvt = { ...evt };
                    newEvt.target.value = parseShortnameInput(
                      newEvt.target.value,
                    );
                    field.onChange(newEvt);
                  }}
                  placeholder="example"
                  autoComplete="off"
                  sx={{ width: inputWidth }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment
                        position="start"
                        sx={{
                          [`&.${inputAdornmentClasses.root}.${inputAdornmentClasses.positionStart}`]:
                            {
                              marginRight: -0.5,
                              [`& .${typographyClasses.root}`]: {
                                color: "rgba(14, 17, 20, 0.33)",
                              },
                            },
                        }}
                      >
                        @
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                columnGap: 1.5,
                borderRadius: "8px",
                borderColor: shortnameError
                  ? "#FCA5A5"
                  : "rgba(36, 130, 255, 0.40)",
                borderWidth: 1,
                borderStyle: "solid",
                maxWidth: 350,
                transitionProperty: "opacity",
                padding: 1.5,
                marginLeft: 2,
              }}
            >
              <CircleRegularInfoIcon
                sx={{
                  color: shortnameError ? "#FCA5A5" : "#2482FF",
                  fontSize: 16,
                }}
              />
              <Typography
                sx={{
                  flex: "1 1 0%",
                  ...(shortnameError
                    ? {
                        color: "#EF4444",
                        fontSize: 13,
                        lineHeight: "1.25rem",
                      }
                    : {
                        color: ({ palette }) => palette.common.black,
                        textOpacity: "0.6",
                        fontSize: 12,
                        lineHeight: "1rem",
                      }),
                }}
              >
                {shortnameError ?? (
                  <>
                    If you’re using HASH for work or a team, you’ll be able to
                    create a separate org{" "}
                    <Link openInNew href="https://hash.ai/guide/webs">
                      web
                    </Link>{" "}
                    later
                  </>
                )}
              </Typography>
            </Box>
          </Box>
        </Box>

        {errorMessage ? (
          <Box mt={2}>
            <Typography
              sx={{
                marginTop: "1.25rem",
                color: "#EF4444",
                fontSize: "0.875rem",
                lineHeight: "1.25rem",
              }}
            >
              {errorMessage}
            </Typography>
          </Box>
        ) : null}
        <Button
          type="submit"
          disabled={!isValid || loading}
          loading={loading}
          endIcon={<ChevronRightRegularIcon />}
          sx={{ width: inputWidth }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
};
